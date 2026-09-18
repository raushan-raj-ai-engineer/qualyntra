/**
 * File: packages/contracts/src/control-plane.ts
 * Purpose: Defines versioned control-plane API, authentication, storage, paging, run, evaluation, and release-decision contracts.
 * Author: Raushan Raj
 */
import type { ActorIdentity,ReleaseDecision,ReleasePolicy,TenantScope } from './governance';
import type { ExecutionRequest,ExecutionStatus } from './execution';
import type { UniversalTestResult } from './result';

export interface ApiPrincipal {
  actor:ActorIdentity;
  authenticationMethod:string;
  identity?:{issuer:string;subject:string;expiresAt:string;tokenId?:string};
}

export interface ControlPlaneAuthenticator {
  configured():boolean;
  authenticate(input:{authorization?:string}):Promise<ApiPrincipal|undefined>;
}

export interface ApiErrorBody {
  error:{
    code:string;
    message:string;
    requestId:string;
    correlationId:string;
    details?:Record<string,unknown>;
  };
}

export interface PageRequest { offset:number; limit:number; }
export interface PageResponse<T> { items:T[]; offset:number; limit:number; total:number; }

export interface RunRecord {
  id:string;
  scope:TenantScope;
  request:ExecutionRequest;
  status:ExecutionStatus;
  createdAt:string;
  updatedAt:string;
  version:number;
  idempotencyKey?:string;
  requestFingerprint?:string;
}

export interface EvaluationRecord {
  id:string;
  scope:TenantScope;
  profileId:string;
  datasetId:string;
  status:'queued'|'running'|'completed'|'failed';
  createdAt:string;
  updatedAt:string;
  metadata?:Record<string,unknown>;
}

export interface StoredReleaseDecision {
  id:string;
  releaseId:string;
  scope:TenantScope;
  decision:ReleaseDecision;
  createdAt:string;
}

export interface ControlPlaneRepository {
  createRun(record:RunRecord):Promise<RunRecord>;
  createRunIdempotently(record:RunRecord):Promise<{record:RunRecord;created:boolean}>;
  findRunByIdempotency(scope:TenantScope,key:string):Promise<RunRecord|undefined>;
  getRun(id:string,scope:TenantScope):Promise<RunRecord|undefined>;
  listRuns(scope:TenantScope,page:PageRequest):Promise<PageResponse<RunRecord>>;
  updateRunStatus(id:string,scope:TenantScope,expectedVersion:number,status:ExecutionStatus):Promise<RunRecord>;
  saveResults(runId:string,scope:TenantScope,results:UniversalTestResult[]):Promise<void>;
  listResults(runId:string,scope:TenantScope,page:PageRequest):Promise<PageResponse<UniversalTestResult>>;
  createEvaluation(record:EvaluationRecord):Promise<EvaluationRecord>;
  getEvaluation(id:string,scope:TenantScope):Promise<EvaluationRecord|undefined>;
  listEvaluations(scope:TenantScope,page:PageRequest):Promise<PageResponse<EvaluationRecord>>;
  savePolicy(scope:TenantScope,policy:ReleasePolicy):Promise<void>;
  getPolicy(scope:TenantScope,id:string):Promise<ReleasePolicy|undefined>;
  listPolicies(scope:TenantScope,page:PageRequest):Promise<PageResponse<ReleasePolicy>>;
  saveReleaseDecision(record:StoredReleaseDecision):Promise<void>;
  getReleaseDecision(releaseId:string,scope:TenantScope):Promise<StoredReleaseDecision|undefined>;
}
