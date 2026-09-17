/**
 * File: packages/distributed/src/coordinator.ts
 * Purpose: Coordinates secure distributed job creation, worker registration, cancellation, recovery, and queue health without binding Qualyntra to a queue vendor.
 * Author: Raushan Raj
 */
import type { AuditSink,TenantScope } from '../../contracts/src/governance';
import type { DistributedExecutionJob,DistributedExecutionQueue,JobRequirements,WorkerCapabilities,WorkerRegistration,WorkerState } from '../../contracts/src/distributed';
import type { ExecutionRequest } from '../../contracts/src/execution';
import { createId } from '../../core/src/ids';
export interface CoordinatorOptions { defaultMaxAttempts:number; workerStaleMs:number; }
export class DistributedExecutionCoordinator{
  constructor(private readonly queue:DistributedExecutionQueue,private readonly options:CoordinatorOptions={defaultMaxAttempts:2,workerStaleMs:60_000},private readonly audit?:AuditSink){}
  async enqueue(input:{scope:TenantScope;request:ExecutionRequest;requirements?:JobRequirements;maxAttempts?:number;actorId?:string;correlationId?:string;metadata?:Record<string,string>}):Promise<DistributedExecutionJob>{if(input.request.env&&Object.keys(input.request.env).length)throw new Error('Distributed jobs must use secretRefs instead of persisted raw environment values.');const now=new Date().toISOString();const maxAttempts=input.maxAttempts??this.options.defaultMaxAttempts;if(!Number.isInteger(maxAttempts)||maxAttempts<1)throw new Error('maxAttempts must be a positive integer.');const requirements:JobRequirements={language:input.request.runtime.language,runner:input.request.runtime.runner,engine:input.request.runtime.engine,...input.requirements};const job:DistributedExecutionJob={id:createId('job'),runId:input.request.runId,scope:structuredClone(input.scope),request:structuredClone(input.request),requirements,state:'queued',attempt:0,maxAttempts,createdAt:now,updatedAt:now,availableAt:now,metadata:input.metadata};const created=await this.queue.enqueue(job);if(this.audit)await this.audit.append({id:createId('audit'),timestamp:now,actorId:input.actorId??'system',action:'distributed.job.enqueue',resource:`job:${job.id}`,outcome:'succeeded',correlationId:input.correlationId,scope:input.scope,metadata:{runId:job.runId,requirements}});return created;}
  async registerWorker(input:{id:string;scope:TenantScope;capabilities:WorkerCapabilities;maxConcurrency:number;state?:WorkerState;metadata?:Record<string,string>}):Promise<WorkerRegistration>{const now=new Date().toISOString();return this.queue.registerWorker({id:input.id,scope:structuredClone(input.scope),capabilities:structuredClone(input.capabilities),maxConcurrency:input.maxConcurrency,state:input.state??'online',registeredAt:now,heartbeatAt:now,activeLeases:0,metadata:input.metadata});}
  heartbeatWorker(id:string,state?:WorkerState){return this.queue.heartbeatWorker(id,new Date().toISOString(),state);}
  cancel(jobId:string){return this.queue.cancel(jobId,new Date().toISOString());}
  recoverExpired(){return this.queue.recoverExpired(new Date().toISOString());}
  health(){return this.queue.health(new Date().toISOString(),this.options.workerStaleMs);}
}
