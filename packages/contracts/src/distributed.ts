/**
 * File: packages/contracts/src/distributed.ts
 * Purpose: Defines vendor-neutral distributed execution jobs, worker capabilities, leases, and queue contracts.
 * Author: Raushan Raj
 */
import type { ExecutionRequest,ExecutionResult } from './execution';
import type { TenantScope } from './governance';

export type DistributedJobState='queued'|'leased'|'running'|'succeeded'|'failed'|'cancelled'|'dead-letter';
export type WorkerState='online'|'draining'|'offline';

export interface WorkerCapabilities {
  languages:string[];
  runners:string[];
  engines?:string[];
  labels?:string[];
  operatingSystems?:string[];
}
export interface WorkerRegistration {
  id:string;
  scope:TenantScope;
  capabilities:WorkerCapabilities;
  maxConcurrency:number;
  state:WorkerState;
  registeredAt:string;
  heartbeatAt:string;
  activeLeases:number;
  metadata?:Record<string,string>;
}
export interface JobRequirements {
  language?:string;
  runner?:string;
  engine?:string;
  labels?:string[];
  operatingSystem?:string;
}
export interface JobLease {
  id:string;
  workerId:string;
  acquiredAt:string;
  heartbeatAt:string;
  expiresAt:string;
}
export interface DistributedExecutionJob {
  id:string;
  runId:string;
  scope:TenantScope;
  request:ExecutionRequest;
  requirements:JobRequirements;
  state:DistributedJobState;
  attempt:number;
  maxAttempts:number;
  createdAt:string;
  updatedAt:string;
  availableAt:string;
  lease?:JobLease;
  result?:ExecutionResult;
  failure?:{message:string;retryable:boolean;failedAt:string};
  metadata?:Record<string,string>;
}
export interface LeaseOptions { now:string; leaseMs:number; workerStaleMs:number; }
export interface DistributedQueueHealth { status:'healthy'|'degraded'|'unavailable'; queued:number; leased:number; running:number; workersOnline:number; checkedAt:string; message?:string; }
export interface DistributedExecutionQueue {
  enqueue(job:DistributedExecutionJob):Promise<DistributedExecutionJob>;
  getJob(id:string):Promise<DistributedExecutionJob|undefined>;
  cancel(id:string,now:string):Promise<DistributedExecutionJob>;
  registerWorker(worker:WorkerRegistration):Promise<WorkerRegistration>;
  getWorker(id:string):Promise<WorkerRegistration|undefined>;
  listWorkers():Promise<WorkerRegistration[]>;
  heartbeatWorker(id:string,now:string,state?:WorkerState):Promise<WorkerRegistration>;
  leaseNext(workerId:string,options:LeaseOptions):Promise<DistributedExecutionJob|undefined>;
  heartbeatLease(jobId:string,leaseId:string,now:string,leaseMs:number):Promise<DistributedExecutionJob>;
  markRunning(jobId:string,leaseId:string,now:string):Promise<DistributedExecutionJob>;
  complete(jobId:string,leaseId:string,result:ExecutionResult,now:string):Promise<DistributedExecutionJob>;
  fail(jobId:string,leaseId:string,input:{message:string;retryable:boolean;now:string;retryDelayMs?:number}):Promise<DistributedExecutionJob>;
  recoverExpired(now:string):Promise<{requeued:string[];deadLettered:string[];workersOffline:string[]}>;
  health(now:string,workerStaleMs:number):Promise<DistributedQueueHealth>;
}
