/**
 * File: packages/control-plane/src/router.ts
 * Purpose: Implements the versioned authenticated REST router with tenant RBAC, idempotency, pagination, rate limits, safe errors, and audit-aware service calls.
 * Author: Raushan Raj
 */
import { createId } from '../../core/src/ids';
import type { GovernancePermission,RoleDefinition } from '../../contracts/src/governance';
import type { ExecutionRequest } from '../../contracts/src/execution';
import type { ControlPlaneAuthenticator } from '../../contracts/src/control-plane';
import { RoleCatalog } from '../../governance/src/rbac';
import type { GovernanceService } from '../../governance/src/service';
import { ApiError,asApiError } from './errors';
import { applyCors,header,json,pagination,readJson,tenantScope } from './http';
import type { RateLimiter } from './rate-limit';
import type { ControlPlaneService } from './service';

export interface ControlPlaneRouterOptions { maxBodyBytes:number; maxPageSize:number; corsOrigins:string[]; }
export interface ControlPlaneRouterDependencies { authenticator:ControlPlaneAuthenticator; governance:GovernanceService; service:ControlPlaneService; rateLimiter:RateLimiter; options:ControlPlaneRouterOptions; readiness?:()=>Promise<{ready:boolean;checks?:Record<string,unknown>}>; }

function split(pathname:string){return pathname.split('/').filter(Boolean);}
function safeObject(value:unknown):Record<string,any>{if(!value||typeof value!=='object'||Array.isArray(value))throw new ApiError(400,'invalid_request','Request body must be a JSON object.');return value as Record<string,any>;}

export function createControlPlaneHandler(deps:ControlPlaneRouterDependencies){
  return async function handle(req:any,res:any):Promise<void>{
    const requestId=createId('req');const correlationId=header(req,'x-correlation-id')??createId('corr');
    res.setHeader('x-request-id',requestId);res.setHeader('x-correlation-id',correlationId);res.setHeader('x-content-type-options','nosniff');
    if(applyCors(req,res,deps.options.corsOrigins))return;
    try{
      const url=new URL(req.url??'/', 'http://localhost');const path=url.pathname;
      if(req.method==='GET'&&(path==='/health'||path==='/api/v1/health')){json(res,200,{status:'ok',version:'1.0.0',requestId});return;}
      if(req.method==='GET'&&(path==='/ready'||path==='/api/v1/ready')){const state=deps.readiness?await deps.readiness():{ready:deps.authenticator.configured()};json(res,state.ready?200:503,{status:state.ready?'ready':'not_ready',checks:state.checks??{},requestId});return;}

      const principal=await deps.authenticator.authenticate({authorization:header(req,'authorization')});
      if(!principal){if(!deps.authenticator.configured())throw new ApiError(503,'authentication_not_configured','Protected API authentication is not configured.');throw new ApiError(401,'unauthorized','Authentication is required.',undefined,{'www-authenticate':'Bearer'});}
      const rate=deps.rateLimiter.consume(principal.actor.id);res.setHeader('x-ratelimit-remaining',String(rate.remaining));if(!rate.allowed)throw new ApiError(429,'rate_limited','Too many requests.',{retryAfterSeconds:rate.retryAfterSeconds},{'retry-after':String(rate.retryAfterSeconds)});
      const scope=tenantScope(req);const parts=split(path);const requirePermission=async(permission:GovernancePermission)=>{const decision=await deps.governance.authorize({actor:principal.actor,permission,resourceScope:scope},correlationId);if(!decision.allowed)throw new ApiError(403,'forbidden','The authenticated actor is not authorized for this operation.');};

      if(req.method==='GET'&&(path==='/capabilities'||path==='/api/v1/capabilities')){await requirePermission('platform.read');json(res,200,{apiVersion:'v1',capabilities:{runs:true,results:true,evaluations:true,releaseDecisions:true,governance:true,audit:true,integrations:true,adapters:true}});return;}
      if(req.method==='GET'&&path==='/api/v1/adapters'){await requirePermission('platform.read');json(res,200,{items:deps.service.adapterDescriptors()});return;}
      if(req.method==='GET'&&path==='/api/v1/runtimes'){await requirePermission('platform.read');json(res,200,{items:deps.service.adapterDescriptors('runtime')});return;}
      if(req.method==='GET'&&path==='/api/v1/providers'){await requirePermission('platform.read');json(res,200,{items:deps.service.adapterDescriptors('model-provider')});return;}
      if(req.method==='GET'&&path==='/api/v1/integrations'){await requirePermission('platform.read');json(res,200,{items:deps.service.adapterDescriptors('integration')});return;}
      if(req.method==='POST'&&parts[0]==='api'&&parts[1]==='v1'&&parts[2]==='integrations'&&parts[4]==='actions'){await requirePermission('integrations.manage');const body=safeObject(await readJson(req,deps.options.maxBodyBytes));const adapterId=parts[3]!;const response=await deps.service.executeIntegration(adapterId,{operation:body.operation,scope,correlationId,payload:body.payload??{}});json(res,200,response);return;}

      if(path==='/api/v1/runs'&&req.method==='POST'){await requirePermission('execution.run');const body=safeObject(await readJson(req,deps.options.maxBodyBytes));const runtime=body.runtime;if(!runtime||typeof runtime!=='object')throw new ApiError(400,'invalid_run','runtime is required.');const result=await deps.service.createRun({actor:principal.actor,scope,request:{...body,runId:typeof body.runId==='string'?body.runId:''} as ExecutionRequest,idempotencyKey:header(req,'idempotency-key'),correlationId});json(res,result.created?201:200,result.record,{'location':`/api/v1/runs/${result.record.id}`});return;}
      if(path==='/api/v1/runs'&&req.method==='GET'){await requirePermission('platform.read');json(res,200,await deps.service.listRuns(scope,pagination(url,deps.options.maxPageSize)));return;}
      if(parts[0]==='api'&&parts[1]==='v1'&&parts[2]==='runs'&&parts[3]&&parts.length===4&&req.method==='GET'){await requirePermission('platform.read');const record=await deps.service.getRun(parts[3],scope);if(!record)throw new ApiError(404,'run_not_found','Run was not found.');json(res,200,record);return;}
      if(parts[0]==='api'&&parts[1]==='v1'&&parts[2]==='runs'&&parts[3]&&parts[4]==='results'&&req.method==='POST'){await requirePermission('results.ingest');const body=await readJson(req,deps.options.maxBodyBytes);if(!Array.isArray(body))throw new ApiError(400,'invalid_results','Request body must be an array of normalized test results.');await deps.service.saveResults(principal.actor,parts[3],scope,body as any[],correlationId);json(res,202,{accepted:(body as any[]).length});return;}
      if(parts[0]==='api'&&parts[1]==='v1'&&parts[2]==='runs'&&parts[3]&&parts[4]==='results'&&req.method==='GET'){await requirePermission('platform.read');json(res,200,await deps.service.listResults(parts[3],scope,pagination(url,deps.options.maxPageSize)));return;}

      if(path==='/api/v1/evaluations'&&req.method==='POST'){await requirePermission('evaluation.run');const body=safeObject(await readJson(req,deps.options.maxBodyBytes));json(res,201,await deps.service.createEvaluation(scope,{profileId:body.profileId,datasetId:body.datasetId,metadata:body.metadata}));return;}
      if(path==='/api/v1/evaluations'&&req.method==='GET'){await requirePermission('platform.read');json(res,200,await deps.service.listEvaluations(scope,pagination(url,deps.options.maxPageSize)));return;}
      if(parts[0]==='api'&&parts[1]==='v1'&&parts[2]==='evaluations'&&parts[3]&&req.method==='GET'){await requirePermission('platform.read');const record=await deps.service.getEvaluation(parts[3],scope);if(!record)throw new ApiError(404,'evaluation_not_found','Evaluation was not found.');json(res,200,record);return;}

      if(path==='/api/v1/policies'&&req.method==='POST'){await requirePermission('governance.manage');const body=safeObject(await readJson(req,deps.options.maxBodyBytes));await deps.service.savePolicy(scope,body as any);json(res,201,body);return;}
      if(path==='/api/v1/policies'&&req.method==='GET'){await requirePermission('governance.read');json(res,200,await deps.service.listPolicies(scope,pagination(url,deps.options.maxPageSize)));return;}
      if(parts[0]==='api'&&parts[1]==='v1'&&parts[2]==='releases'&&parts[3]&&parts[4]==='decision'&&req.method==='POST'){await requirePermission('release.evaluate');const body=safeObject(await readJson(req,deps.options.maxBodyBytes));if(!body.policyId||!Array.isArray(body.facts))throw new ApiError(400,'invalid_release_request','policyId and facts are required.');json(res,200,await deps.service.evaluateRelease({actor:principal.actor,releaseId:parts[3],scope,policyId:body.policyId,facts:body.facts,approvals:body.approvals,exceptions:body.exceptions,correlationId}));return;}
      if(parts[0]==='api'&&parts[1]==='v1'&&parts[2]==='releases'&&parts[3]&&parts[4]==='decision'&&req.method==='GET'){await requirePermission('governance.read');const record=await deps.service.getReleaseDecision(parts[3],scope);if(!record)throw new ApiError(404,'release_decision_not_found','Release decision was not found.');json(res,200,record);return;}
      if(path==='/api/v1/audit'&&req.method==='GET'){await requirePermission('audit.read');const records=deps.service.auditRecords(scope);const page=pagination(url,deps.options.maxPageSize);json(res,200,{items:records.slice(page.offset,page.offset+page.limit),offset:page.offset,limit:page.limit,total:records.length});return;}

      throw new ApiError(404,'not_found','API route was not found.');
    }catch(error){const api=asApiError(error);json(res,api.status,{error:{code:api.code,message:api.message,requestId,correlationId,details:api.details}},api.headers);}
  };
}

export function createBuiltInRoleCatalog():RoleCatalog{
  const all:GovernancePermission[]=['platform.read','execution.run','results.ingest','evaluation.run','governance.read','governance.manage','integrations.manage','secrets.resolve','release.evaluate','release.approve','audit.read'];
  const roles:RoleDefinition[]=[{id:'platform-admin',displayName:'Platform Administrator',permissions:all},{id:'quality-engineer',displayName:'Quality Engineer',permissions:['platform.read','execution.run','results.ingest','evaluation.run','governance.read','release.evaluate']},{id:'quality-viewer',displayName:'Quality Viewer',permissions:['platform.read','governance.read','audit.read']}];
  return new RoleCatalog(roles);
}
