/**
 * File: packages/control-plane/src/service.ts
 * Purpose: Coordinates tenant-aware control-plane run, result, evaluation, policy, release, adapter, integration, and audit operations.
 * Author: Raushan Raj
 */
import { createHash } from 'node:crypto';
import type { AdapterRegistry } from '../../core/src/adapter-registry';
import { createId } from '../../core/src/ids';
import type { ControlPlaneRepository,EvaluationRecord,RunRecord,StoredReleaseDecision } from '../../contracts/src/control-plane';
import type { ActorIdentity,EvidenceFact,PolicyException,ReleaseApproval,ReleasePolicy,TenantScope,AuditRecord,AuditSink } from '../../contracts/src/governance';
import type { ExecutionRequest } from '../../contracts/src/execution';
import type { UniversalTestResult } from '../../contracts/src/result';
import type { IntegrationRequest } from '../../contracts/src/integration';
import { GovernanceService } from '../../governance/src/service';
import { scopeContains } from '../../governance/src/tenancy';
import { IntegrationService } from '../../integrations/src/service';
import { ApiError } from './errors';

function fingerprint(value:unknown):string{return createHash('sha256').update(JSON.stringify(value)).digest('hex');}
export interface AuditReader { snapshot():AuditRecord[]; }

export class ControlPlaneService{
  constructor(
    private readonly repository:ControlPlaneRepository,
    private readonly governance:GovernanceService,
    private readonly adapters:AdapterRegistry,
    private readonly integrations:IntegrationService,
    private readonly audit:AuditSink&AuditReader,
  ){}

  async createRun(input:{actor:ActorIdentity;scope:TenantScope;request:ExecutionRequest;idempotencyKey?:string;correlationId:string}):Promise<{record:RunRecord;created:boolean}>{
    const now=new Date().toISOString();if(input.request.env&&Object.keys(input.request.env).length>0)throw new ApiError(400,'raw_environment_not_allowed','Control-plane runs must use secretRefs instead of persisted raw environment values.');const requestFingerprint=fingerprint(input.request);
    if(input.idempotencyKey){const prior=await this.repository.findRunByIdempotency(input.scope,input.idempotencyKey);if(prior){if(prior.requestFingerprint!==requestFingerprint)throw new ApiError(409,'idempotency_conflict','The idempotency key was already used with a different request.');return{record:prior,created:false};}}
    const id=createId('run');const record:RunRecord={id,scope:input.scope,request:{...input.request,runId:id},status:'queued',createdAt:now,updatedAt:now,idempotencyKey:input.idempotencyKey,requestFingerprint};
    await this.repository.createRun(record);await this.audit.append({id:createId('audit'),timestamp:now,actorId:input.actor.id,action:'run.create',resource:`run:${id}`,outcome:'succeeded',correlationId:input.correlationId,scope:input.scope,metadata:{runtime:input.request.runtime,idempotent:Boolean(input.idempotencyKey)}});return{record,created:true};
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
  auditRecords(scope:TenantScope){return this.audit.snapshot().filter(record=>record.scope&&scopeContains(scope,record.scope));}
}
