/**
 * File: packages/control-plane/src/repository.ts
 * Purpose: Implements storage-neutral control-plane repository contracts with an in-memory reference implementation for local use and tests.
 * Author: Raushan Raj
 */
import type { ControlPlaneRepository,EvaluationRecord,PageRequest,PageResponse,RunRecord,StoredReleaseDecision } from '../../contracts/src/control-plane';
import type { ReleasePolicy,TenantScope } from '../../contracts/src/governance';
import type { ExecutionStatus } from '../../contracts/src/execution';
import { OptimisticConcurrencyError } from '../../persistence/src/errors';
import type { UniversalTestResult } from '../../contracts/src/result';
import { scopeContains } from '../../governance/src/tenancy';

function clone<T>(value:T):T{return structuredClone(value);}
function visible(requested:TenantScope,resource:TenantScope):boolean{return scopeContains(requested,resource);}
function sameScope(a:TenantScope,b:TenantScope):boolean{return a.organizationId===b.organizationId&&a.workspaceId===b.workspaceId&&a.projectId===b.projectId&&a.environmentId===b.environmentId;}
function page<T>(items:T[],request:PageRequest):PageResponse<T>{const total=items.length;return{items:items.slice(request.offset,request.offset+request.limit).map(clone),offset:request.offset,limit:request.limit,total};}
function policyKey(scope:TenantScope,id:string):string{return `${scope.organizationId}/${scope.workspaceId??''}/${scope.projectId??''}/${scope.environmentId??''}:${id}`;}

export class InMemoryControlPlaneRepository implements ControlPlaneRepository{
  private readonly runs=new Map<string,RunRecord>();
  private readonly results=new Map<string,UniversalTestResult[]>();
  private readonly evaluations=new Map<string,EvaluationRecord>();
  private readonly policies=new Map<string,{scope:TenantScope;policy:ReleasePolicy}>();
  private readonly decisions=new Map<string,StoredReleaseDecision>();

  async createRun(record:RunRecord):Promise<RunRecord>{if(this.runs.has(record.id))throw new Error(`Run already exists: ${record.id}`);this.runs.set(record.id,clone(record));return clone(record);}
  async findRunByIdempotency(scope:TenantScope,key:string):Promise<RunRecord|undefined>{for(const record of this.runs.values())if(record.idempotencyKey===key&&sameScope(scope,record.scope))return clone(record);return undefined;}
  async getRun(id:string,scope:TenantScope):Promise<RunRecord|undefined>{const record=this.runs.get(id);return record&&visible(scope,record.scope)?clone(record):undefined;}
  async listRuns(scope:TenantScope,request:PageRequest):Promise<PageResponse<RunRecord>>{const items=[...this.runs.values()].filter(item=>visible(scope,item.scope)).sort((a,b)=>a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));return page(items,request);}
  async updateRunStatus(id:string,scope:TenantScope,expectedVersion:number,status:ExecutionStatus):Promise<RunRecord>{const record=this.runs.get(id);if(!record||!visible(scope,record.scope))throw new Error(`Run not found: ${id}`);if(record.version!==expectedVersion)throw new OptimisticConcurrencyError('run',id,expectedVersion);const updated={...record,status,updatedAt:new Date().toISOString(),version:record.version+1};this.runs.set(id,updated);return clone(updated);}
  async saveResults(runId:string,scope:TenantScope,results:UniversalTestResult[]):Promise<void>{const run=await this.getRun(runId,scope);if(!run)throw new Error(`Run not found: ${runId}`);this.results.set(runId,results.map(clone));}
  async listResults(runId:string,scope:TenantScope,request:PageRequest):Promise<PageResponse<UniversalTestResult>>{const run=await this.getRun(runId,scope);if(!run)throw new Error(`Run not found: ${runId}`);return page(this.results.get(runId)??[],request);}
  async createEvaluation(record:EvaluationRecord):Promise<EvaluationRecord>{if(this.evaluations.has(record.id))throw new Error(`Evaluation already exists: ${record.id}`);this.evaluations.set(record.id,clone(record));return clone(record);}
  async getEvaluation(id:string,scope:TenantScope):Promise<EvaluationRecord|undefined>{const record=this.evaluations.get(id);return record&&visible(scope,record.scope)?clone(record):undefined;}
  async listEvaluations(scope:TenantScope,request:PageRequest):Promise<PageResponse<EvaluationRecord>>{return page([...this.evaluations.values()].filter(item=>visible(scope,item.scope)),request);}
  async savePolicy(scope:TenantScope,policy:ReleasePolicy):Promise<void>{this.policies.set(policyKey(scope,policy.id),{scope:clone(scope),policy:clone(policy)});}
  async getPolicy(scope:TenantScope,id:string):Promise<ReleasePolicy|undefined>{const value=this.policies.get(policyKey(scope,id));return value?clone(value.policy):undefined;}
  async listPolicies(scope:TenantScope,request:PageRequest):Promise<PageResponse<ReleasePolicy>>{return page([...this.policies.values()].filter(item=>visible(scope,item.scope)).map(item=>item.policy),request);}
  async saveReleaseDecision(record:StoredReleaseDecision):Promise<void>{this.decisions.set(policyKey(record.scope,record.releaseId),clone(record));}
  async getReleaseDecision(releaseId:string,scope:TenantScope):Promise<StoredReleaseDecision|undefined>{const record=this.decisions.get(policyKey(scope,releaseId));return record?clone(record):undefined;}
}
