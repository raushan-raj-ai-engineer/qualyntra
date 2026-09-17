/**
 * File: packages/distributed/src/worker-agent.ts
 * Purpose: Executes one leased distributed job through registered runner adapters with lease safety, lifecycle hooks, retries, and no queue-vendor coupling.
 * Author: Raushan Raj
 */
import type { AdapterRegistry } from '../../core/src/adapter-registry';
import type { DistributedExecutionJob,DistributedWorkerControlPlane,WorkerRegistration } from '../../contracts/src/distributed';
import type { Adapter } from '../../contracts/src/adapter';
import type { ExecutionRequest,ExecutionResult,RunnerAdapter } from '../../contracts/src/execution';
export interface WorkerAgentOptions { leaseMs:number; workerStaleMs:number; retryDelayMs:number; heartbeatMs?:number; heartbeatWorkerBeforeLease?:boolean; }
export interface WorkerAgentLifecycle {
  prepare?(job:DistributedExecutionJob):Promise<ExecutionRequest|undefined>;
  afterResult?(job:DistributedExecutionJob,result:ExecutionResult):Promise<ExecutionResult|undefined>;
  finalize?(job:DistributedExecutionJob):Promise<void>;
}
function runnerAdapterId(runner:string):string{return runner.startsWith('runner.')?runner:`runner.${runner}`;}
export class DistributedWorkerAgent{
  constructor(private readonly worker:WorkerRegistration,private readonly queue:DistributedWorkerControlPlane,private readonly adapters:AdapterRegistry,private readonly options:WorkerAgentOptions={leaseMs:30_000,workerStaleMs:60_000,retryDelayMs:1_000},private readonly lifecycle:WorkerAgentLifecycle={}){}
  async heartbeat(){return this.queue.heartbeatWorker(this.worker.id,new Date().toISOString(),this.worker.state);}
  async processOne():Promise<{processed:boolean;jobId?:string;state?:string}>{const now=new Date().toISOString();if(this.options.heartbeatWorkerBeforeLease!==false)await this.queue.heartbeatWorker(this.worker.id,now,this.worker.state);const job=await this.queue.leaseNext(this.worker.id,{now,leaseMs:this.options.leaseMs,workerStaleMs:this.options.workerStaleMs});if(!job||!job.lease)return{processed:false};const leaseId=job.lease.id;let leaseLost:Error|undefined;const heartbeatMs=this.options.heartbeatMs??Math.max(1,Math.floor(this.options.leaseMs/3));let heartbeatInFlight=false;const timer=setInterval(()=>{if(heartbeatInFlight||leaseLost)return;heartbeatInFlight=true;void this.queue.heartbeatLease(job.id,leaseId,new Date().toISOString(),this.options.leaseMs).catch(error=>{leaseLost=error instanceof Error?error:new Error('Distributed lease heartbeat failed.');}).finally(()=>{heartbeatInFlight=false;});},heartbeatMs);try{await this.queue.markRunning(job.id,leaseId,new Date().toISOString());const request=await this.lifecycle.prepare?.(job)??job.request;const adapter=this.adapters.get<Adapter&RunnerAdapter>(runnerAdapterId(request.runtime.runner));if(adapter.descriptor.kind!=='runner')throw new Error(`Adapter is not a runner: ${adapter.descriptor.id}`);let result=await adapter.execute(request);result=await this.lifecycle.afterResult?.(job,result)??result;if(leaseLost)throw leaseLost;const completed=await this.queue.complete(job.id,leaseId,result,new Date().toISOString());return{processed:true,jobId:job.id,state:completed.state};}catch(error){const message=error instanceof Error?error.message:'Distributed runner execution failed.';try{const failed=await this.queue.fail(job.id,leaseId,{message,retryable:true,now:new Date().toISOString(),retryDelayMs:this.options.retryDelayMs});return{processed:true,jobId:job.id,state:failed.state};}catch{return{processed:true,jobId:job.id,state:'lease-lost'};}}finally{clearInterval(timer);try{await this.lifecycle.finalize?.(job);}catch{}}}
}
