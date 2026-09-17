/**
 * File: packages/agent/src/control-plane-client.ts
 * Purpose: Implements the authenticated tenant-aware HTTP worker protocol used by standalone execution agents without exposing queue internals.
 * Author: Raushan Raj
 */
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import type { DistributedExecutionJob,DistributedWorkerControlPlane,LeaseOptions,WorkerRegistration,WorkerState } from '../../contracts/src/distributed';
import type { ExecutionResult } from '../../contracts/src/execution';
import type { ArtifactRecord } from '../../contracts/src/artifact';
import type { HealthSignal,LogRecord,MetricPoint } from '../../contracts/src/observability';
import type { TenantScope } from '../../contracts/src/governance';
import type { AgentTokenProvider } from './credentials';

export interface AgentControlPlaneClientOptions { origin:string; tokenProvider:AgentTokenProvider; scope:TenantScope; maxResponseBytes?:number; }
function tenantHeaders(scope:TenantScope):Record<string,string>{return{'x-qualyntra-organization-id':scope.organizationId,...(scope.workspaceId?{'x-qualyntra-workspace-id':scope.workspaceId}:{}),...(scope.projectId?{'x-qualyntra-project-id':scope.projectId}:{}),...(scope.environmentId?{'x-qualyntra-environment-id':scope.environmentId}:{})};}
async function boundedText(response:any,maxBytes:number):Promise<string>{if(!response.body)return'';const chunks:any[]=[];let bytes=0;for await(const chunk of response.body as any){const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);bytes+=buffer.length;if(bytes>maxBytes)throw new Error('Control-plane response exceeded configured size limit.');chunks.push(buffer);}return Buffer.concat(chunks).toString('utf8');}
export class AgentControlPlaneClient implements DistributedWorkerControlPlane{
  private readonly maxResponseBytes:number;
  constructor(private readonly options:AgentControlPlaneClientOptions){this.maxResponseBytes=options.maxResponseBytes??2_097_152;}
  async registerWorker(worker:WorkerRegistration):Promise<WorkerRegistration>{return this.json('POST','/api/v1/agents/register',{id:worker.id,capabilities:worker.capabilities,maxConcurrency:worker.maxConcurrency,state:worker.state,metadata:worker.metadata});}
  async heartbeatWorker(id:string,_now:string,state?:WorkerState):Promise<WorkerRegistration>{return this.json('POST',`/api/v1/agents/${encodeURIComponent(id)}/heartbeat`,{state});}
  async leaseNext(workerId:string,options:LeaseOptions):Promise<DistributedExecutionJob|undefined>{const response=await this.json<any>('POST',`/api/v1/agents/${encodeURIComponent(workerId)}/lease`,{leaseMs:options.leaseMs,workerStaleMs:options.workerStaleMs});return response.job??undefined;}
  async heartbeatLease(jobId:string,leaseId:string,_now:string,leaseMs:number):Promise<DistributedExecutionJob>{return this.json('POST',`/api/v1/agent-jobs/${encodeURIComponent(jobId)}/leases/${encodeURIComponent(leaseId)}/heartbeat`,{leaseMs});}
  async markRunning(jobId:string,leaseId:string,_now:string):Promise<DistributedExecutionJob>{return this.json('POST',`/api/v1/agent-jobs/${encodeURIComponent(jobId)}/leases/${encodeURIComponent(leaseId)}/running`,{});}
  async complete(jobId:string,leaseId:string,result:ExecutionResult,_now:string):Promise<DistributedExecutionJob>{return this.json('POST',`/api/v1/agent-jobs/${encodeURIComponent(jobId)}/leases/${encodeURIComponent(leaseId)}/complete`,{result});}
  async fail(jobId:string,leaseId:string,input:{message:string;retryable:boolean;now:string;retryDelayMs?:number}):Promise<DistributedExecutionJob>{return this.json('POST',`/api/v1/agent-jobs/${encodeURIComponent(jobId)}/leases/${encodeURIComponent(leaseId)}/fail`,{message:input.message,retryable:input.retryable,retryDelayMs:input.retryDelayMs});}
  async uploadArtifact(input:{file:string;runId:string;name?:string;kind?:string;contentType?:string;correlationId?:string}):Promise<ArtifactRecord>{const stat=await fs.stat(input.file);if(!stat.isFile())throw new Error('Agent artifact path must reference a regular file.');const query=new URLSearchParams({runId:input.runId,name:input.name??path.basename(input.file),kind:input.kind??'attachment'});const url=`/api/v1/artifacts?${query.toString()}`;return this.raw('POST',url,createReadStream(input.file),{'content-type':input.contentType??'application/octet-stream','content-length':String(stat.size)},input.correlationId);}
  emitHealth(signal:HealthSignal){return this.json('POST','/api/v1/observability/health',signal,signal.correlationId);}
  emitLog(record:LogRecord){return this.json('POST','/api/v1/observability/logs',record,record.correlationId);}
  emitMetric(point:MetricPoint){return this.json('POST','/api/v1/observability/metrics',point,point.correlationId);}
  private async json<T>(method:string,pathname:string,body:unknown,correlationId?:string):Promise<T>{return this.raw(method,pathname,JSON.stringify(body),{'content-type':'application/json; charset=utf-8'},correlationId);}
  private async raw<T>(method:string,pathname:string,body:any,extraHeaders:Record<string,string>,correlationId?:string):Promise<T>{const token=await this.options.tokenProvider();const headers:Record<string,string>={authorization:`Bearer ${token}`,...tenantHeaders(this.options.scope),...extraHeaders};if(correlationId)headers['x-correlation-id']=correlationId;const response=await fetch(`${this.options.origin}${pathname}`,{method,headers,body,...(typeof body==='string'?{}:{duplex:'half'})} as any);const text=await boundedText(response,this.maxResponseBytes);let parsed:any={};if(text){try{parsed=JSON.parse(text);}catch{if(!response.ok)throw new Error(`Control-plane request failed with HTTP ${response.status}.`);throw new Error('Control-plane returned invalid JSON.');}}if(!response.ok)throw new Error(parsed?.error?.message??`Control-plane request failed with HTTP ${response.status}.`);return parsed as T;}
}
