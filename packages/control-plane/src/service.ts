/**
 * File: packages/control-plane/src/service.ts
 * Purpose: Coordinates tenant-aware control-plane run, result, evaluation, policy, release, adapter, integration, and audit operations.
 * Author: Raushan Raj
 */
import { createHash } from 'node:crypto';
import type { AdapterRegistry } from '../../core/src/adapter-registry';
import { createId } from '../../core/src/ids';
import type { ControlPlaneRepository,EvaluationRecord,RunRecord,StoredReleaseDecision } from '../../contracts/src/control-plane';
import type { ActorIdentity,EvidenceFact,PolicyException,ReleaseApproval,ReleasePolicy,TenantScope,AuditReader,AuditSink } from '../../contracts/src/governance';
import type { ExecutionRequest } from '../../contracts/src/execution';
import type { UniversalTestResult } from '../../contracts/src/result';
import type { IntegrationRequest } from '../../contracts/src/integration';
import type { NotificationRequest } from '../../contracts/src/notification';
import type { DistributedExecutionJob,DistributedExecutionQueue,JobRequirements,WorkerCapabilities,WorkerRegistration,WorkerState } from '../../contracts/src/distributed';
import type { ArtifactKind,ArtifactRecord } from '../../contracts/src/artifact';
import type { HealthSignal,LogRecord,MetricPoint } from '../../contracts/src/observability';
import type { ObservabilityService } from '../../observability/src/service';
import type { NotificationService } from '../../notifications/src/service';
import type { DistributedExecutionCoordinator } from '../../distributed/src/coordinator';
import type { ArtifactService } from '../../artifacts/src/service';
import { scopeContains } from '../../governance/src/tenancy';
import { GovernanceService } from '../../governance/src/service';
import { IntegrationService } from '../../integrations/src/service';
import { ApiError } from './errors';

function fingerprint(value:unknown):string{return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
export class ControlPlaneService{
  constructor(
    private readonly repository:ControlPlaneRepository,
    private readonly governance:GovernanceService,
    private readonly adapters:AdapterRegistry,
    private readonly integrations:IntegrationService,
    private readonly audit:AuditSink&AuditReader,
    private readonly observability?:ObservabilityService,
    private readonly notifications?:NotificationService,
    private readonly distributed?:{coordinator:DistributedExecutionCoordinator;queue:DistributedExecutionQueue},
    private readonly artifacts?:{service:ArtifactService;storageAdapterId:string},
  ){}

  async createRun(input:{actor:ActorIdentity;scope:TenantScope;request:ExecutionRequest;idempotencyKey?:string;correlationId:string}):Promise<{record:RunRecord;created:boolean}>{
    const now=new Date().toISOString();if(input.request.env&&Object.keys(input.request.env).length>0)throw new ApiError(400,'raw_environment_not_allowed','Control-plane runs must use secretRefs instead of persisted raw environment values.');const requestFingerprint=fingerprint(input.request);
    const id=createId('run');const record:RunRecord={id,scope:input.scope,request:{...input.request,runId:id},status:'queued',createdAt:now,updatedAt:now,version:1,idempotencyKey:input.idempotencyKey,requestFingerprint};
    const stored=input.idempotencyKey?await this.repository.createRunIdempotently(record):{record:await this.repository.createRun(record),created:true};if(!stored.created&&stored.record.requestFingerprint!==requestFingerprint)throw new ApiError(409,'idempotency_conflict','The idempotency key was already used with a different request.');if(stored.created)await this.audit.append({id:createId('audit'),timestamp:now,actorId:input.actor.id,action:'run.create',resource:`run:${stored.record.id}`,outcome:'succeeded',correlationId:input.correlationId,scope:input.scope,metadata:{runtime:input.request.runtime,idempotent:Boolean(input.idempotencyKey)}});return stored;
  }
  getRun(id:string,scope:TenantScope){return this.repository.getRun(id,scope);}listRuns(scope:TenantScope,page:any){return this.repository.listRuns(scope,page);}
  async saveResults(actor:ActorIdentity,runId:string,scope:TenantScope,results:UniversalTestResult[],correlationId:string){const normalized=results.map((result,index)=>{if(!result||typeof result!=='object'||!result.id?.trim()||!result.name?.trim()||!['passed','failed','skipped','error'].includes(result.status)||!result.runtime)throw new ApiError(400,'invalid_results',`Result at index ${index} does not satisfy the UniversalTestResult contract.`);return{...result,runId};});await this.repository.saveResults(runId,scope,normalized);await this.audit.append({id:createId('audit'),timestamp:new Date().toISOString(),actorId:actor.id,action:'results.save',resource:`run:${runId}`,outcome:'succeeded',correlationId,scope,metadata:{count:normalized.length}});}
  listResults(runId:string,scope:TenantScope,page:any){return this.repository.listResults(runId,scope,page);}
  async createEvaluation(scope:TenantScope,input:{profileId:string;datasetId:string;metadata?:Record<string,unknown>}):Promise<EvaluationRecord>{if(!input.profileId?.trim()||!input.datasetId?.trim())throw new ApiError(400,'invalid_evaluation','profileId and datasetId are required.');const now=new Date().toISOString();return this.repository.createEvaluation({id:createId('eval'),scope,profileId:input.profileId,datasetId:input.datasetId,status:'queued',createdAt:now,updatedAt:now,metadata:input.metadata});}
  getEvaluation(id:string,scope:TenantScope){return this.repository.getEvaluation(id,scope);}listEvaluations(scope:TenantScope,page:any){return this.repository.listEvaluations(scope,page);}
  savePolicy(scope:TenantScope,policy:ReleasePolicy){if(!policy.id?.trim()||!policy.name?.trim()||!Array.isArray(policy.rules))throw new ApiError(400,'invalid_policy','Policy id, name, and rules are required.');return this.repository.savePolicy(scope,policy);}listPolicies(scope:TenantScope,page:any){return this.repository.listPolicies(scope,page);}
  async evaluateRelease(input:{actor:ActorIdentity;releaseId:string;scope:TenantScope;policyId:string;facts:EvidenceFact[];approvals?:ReleaseApproval[];exceptions?:PolicyException[];correlationId:string}):Promise<StoredReleaseDecision>{const policy=await this.repository.getPolicy(input.scope,input.policyId);if(!policy)throw new ApiError(404,'policy_not_found','Release policy was not found.');const decision=await this.governance.evaluateRelease({actorId:input.actor.id,policy,scope:input.scope,facts:input.facts,approvals:input.approvals,exceptions:input.exceptions,correlationId:input.correlationId});const stored={id:createId('decision'),releaseId:input.releaseId,scope:input.scope,decision,createdAt:new Date().toISOString()};await this.repository.saveReleaseDecision(stored);return stored;}
  getReleaseDecision(releaseId:string,scope:TenantScope){return this.repository.getReleaseDecision(releaseId,scope);}
  adapterDescriptors(kind?:string){return this.adapters.list(kind as any).map(adapter=>structuredClone(adapter.descriptor));}
  async executeIntegration(adapterId:string,request:IntegrationRequest){return this.integrations.execute(adapterId,request);}
  auditRecords(scope:TenantScope){return this.audit.list(scope);}
  observabilityConfigured(){return Boolean(this.observability);}
  notificationsConfigured(){return Boolean(this.notifications);}
  observabilitySummary(scope:TenantScope){if(!this.observability)throw new ApiError(503,'observability_not_configured','Observability service is not configured.');return this.observability.summary(scope);}
  alertRecords(scope:TenantScope,limit?:number){if(!this.observability)throw new ApiError(503,'observability_not_configured','Observability service is not configured.');return this.observability.listAlerts(scope,limit);}
  notificationDescriptors(){return this.notifications?.list().map(adapter=>structuredClone(adapter.descriptor))??[];}
  sendNotification(adapterId:string,request:NotificationRequest){if(!this.notifications)throw new ApiError(503,'notifications_not_configured','Notification service is not configured.');return this.notifications.send(adapterId,request);}

  distributedConfigured(){return Boolean(this.distributed);}
  artifactsConfigured(){return Boolean(this.artifacts);}
  async enqueueDistributedJob(input:{actor:ActorIdentity;scope:TenantScope;request:ExecutionRequest;requirements?:JobRequirements;maxAttempts?:number;correlationId:string;metadata?:Record<string,string>}):Promise<DistributedExecutionJob>{const distributed=this.requireDistributed();return distributed.coordinator.enqueue({scope:input.scope,request:input.request,requirements:input.requirements,maxAttempts:input.maxAttempts,actorId:input.actor.id,correlationId:input.correlationId,metadata:{...(input.metadata??{}),correlationId:input.correlationId}});}
  async registerExecutionAgent(input:{id:string;scope:TenantScope;capabilities:WorkerCapabilities;maxConcurrency:number;state?:WorkerState;metadata?:Record<string,string>}):Promise<WorkerRegistration>{const distributed=this.requireDistributed();if(!/^worker_[A-Za-z0-9-]+$/.test(input.id))throw new ApiError(400,'worker_id_invalid','Execution-agent id is invalid.');if(!Number.isInteger(input.maxConcurrency)||input.maxConcurrency<1||input.maxConcurrency>128)throw new ApiError(400,'invalid_worker_concurrency','maxConcurrency must be between 1 and 128.');if(!Array.isArray(input.capabilities.languages)||!Array.isArray(input.capabilities.runners)||input.capabilities.runners.length===0||input.capabilities.runners.length>256)throw new ApiError(400,'invalid_worker_capabilities','Worker capabilities must include one to 256 runners and a languages array.');return distributed.coordinator.registerWorker({id:input.id,scope:input.scope,capabilities:input.capabilities,maxConcurrency:input.maxConcurrency,state:input.state,metadata:input.metadata});}
  async heartbeatExecutionAgent(scope:TenantScope,workerId:string,state?:WorkerState){await this.requireWorkerScope(scope,workerId);return this.requireDistributed().coordinator.heartbeatWorker(workerId,state);}
  async leaseExecutionAgentJob(scope:TenantScope,workerId:string,input:{leaseMs:number;workerStaleMs:number}){await this.requireWorkerScope(scope,workerId);this.validateLeaseTiming(input.leaseMs,input.workerStaleMs);return this.requireDistributed().queue.leaseNext(workerId,{now:new Date().toISOString(),leaseMs:input.leaseMs,workerStaleMs:input.workerStaleMs});}
  async heartbeatExecutionLease(scope:TenantScope,jobId:string,leaseId:string,leaseMs:number){this.validateLeaseTiming(leaseMs,leaseMs);await this.requireLeaseScope(scope,jobId,leaseId);return this.requireDistributed().queue.heartbeatLease(jobId,leaseId,new Date().toISOString(),leaseMs);}
  async markExecutionRunning(scope:TenantScope,jobId:string,leaseId:string){await this.requireLeaseScope(scope,jobId,leaseId);return this.requireDistributed().queue.markRunning(jobId,leaseId,new Date().toISOString());}
  async completeExecutionJob(scope:TenantScope,jobId:string,leaseId:string,result:any){const job=await this.requireLeaseScope(scope,jobId,leaseId);if(!result||result.runId!==job.runId||!['passed','failed','skipped','cancelled','error'].includes(result.status))throw new ApiError(400,'invalid_execution_result','Execution result must match the leased run and contain a valid terminal status.');return this.requireDistributed().queue.complete(jobId,leaseId,result,new Date().toISOString());}
  async failExecutionJob(scope:TenantScope,jobId:string,leaseId:string,input:{message:string;retryable:boolean;retryDelayMs?:number}){await this.requireLeaseScope(scope,jobId,leaseId);if(!input.message.trim()||input.message.length>4096)throw new ApiError(400,'invalid_execution_failure','Failure message must contain 1 to 4096 characters.');if(input.retryDelayMs!==undefined&&(!Number.isInteger(input.retryDelayMs)||input.retryDelayMs<0||input.retryDelayMs>300_000))throw new ApiError(400,'invalid_retry_delay','retryDelayMs must be between 0 and 300000.');return this.requireDistributed().queue.fail(jobId,leaseId,{...input,now:new Date().toISOString()});}
  async storeAgentArtifact(input:{actor:ActorIdentity;scope:TenantScope;body:AsyncIterable<Uint8Array>;kind:ArtifactKind;name:string;contentType:string;runId?:string;correlationId:string}):Promise<ArtifactRecord>{if(!this.artifacts)throw new ApiError(503,'artifacts_not_configured','Artifact storage service is not configured.');return this.artifacts.service.store({storageAdapterId:this.artifacts.storageAdapterId,scope:input.scope,body:input.body,kind:input.kind,name:input.name,contentType:input.contentType,actorId:input.actor.id,correlationId:input.correlationId,runId:input.runId});}
  listArtifacts(scope:TenantScope,page:{offset:number;limit:number;runId?:string}){if(!this.artifacts)throw new ApiError(503,'artifacts_not_configured','Artifact storage service is not configured.');return this.artifacts.service.list(scope,page);}
  async verifyArtifact(scope:TenantScope,id:string):Promise<{verified:true;id:string;sizeBytes:number;sha256:string}>{if(!this.artifacts)throw new ApiError(503,'artifacts_not_configured','Artifact storage service is not configured.');const record=await this.artifacts.service.get(scope,id);if(!record)throw new ApiError(404,'artifact_not_found','Artifact was not found in the requested tenant scope.');let size=0;for await(const chunk of await this.artifacts.service.downloadVerified(scope,id))size+=chunk.byteLength;return{verified:true,id:record.id,sizeBytes:size,sha256:record.sha256};}
  emitAgentHealth(signal:HealthSignal){if(!this.observability)throw new ApiError(503,'observability_not_configured','Observability service is not configured.');return this.observability.recordHealth(signal);}
  emitAgentLog(record:LogRecord){if(!this.observability)throw new ApiError(503,'observability_not_configured','Observability service is not configured.');return this.observability.emitLog(record);}
  emitAgentMetric(point:MetricPoint){if(!this.observability)throw new ApiError(503,'observability_not_configured','Observability service is not configured.');return this.observability.recordMetric(point);}
  private requireDistributed(){if(!this.distributed)throw new ApiError(503,'distributed_execution_not_configured','Distributed execution service is not configured.');return this.distributed;}
  private async requireWorkerScope(scope:TenantScope,workerId:string){const worker=await this.requireDistributed().queue.getWorker(workerId);if(!worker||!scopeContains(scope,worker.scope))throw new ApiError(404,'worker_not_found','Execution agent was not found in the requested tenant scope.');return worker;}
  private async requireLeaseScope(scope:TenantScope,jobId:string,leaseId:string){const job=await this.requireDistributed().queue.getJob(jobId);if(!job||!scopeContains(scope,job.scope)||job.lease?.id!==leaseId)throw new ApiError(404,'lease_not_found','Execution lease was not found in the requested tenant scope.');return job;}
  private validateLeaseTiming(leaseMs:number,workerStaleMs:number){if(!Number.isInteger(leaseMs)||leaseMs<5_000||leaseMs>300_000)throw new ApiError(400,'invalid_lease','leaseMs must be between 5000 and 300000.');if(!Number.isInteger(workerStaleMs)||workerStaleMs<leaseMs||workerStaleMs>900_000)throw new ApiError(400,'invalid_worker_stale','workerStaleMs must be between leaseMs and 900000.');}
}
