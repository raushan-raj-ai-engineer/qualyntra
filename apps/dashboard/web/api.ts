/**
 * File: apps/dashboard/web/api.ts
 * Purpose: Provides a typed same-origin browser client for the Qualyntra dashboard BFF without handling backend credentials.
 * Author: Raushan Raj
 */
export interface TenantScope { organizationId:string;workspaceId?:string;projectId?:string;environmentId?:string; }
export interface Page<T>{items:T[];offset:number;limit:number;total:number;}
export interface RunRecord { id:string;status:string;createdAt:string;updatedAt:string;request?:{runtime?:{language?:string;runner?:string;engine?:string}}; }
export interface EvaluationRecord {id:string;profileId:string;datasetId:string;status:string;createdAt:string;updatedAt:string;}
export interface AdapterDescriptor {id:string;kind:string;displayName?:string;version?:string;capabilities?:string[];}
export interface AuditRecord {id:string;timestamp:string;actorId:string;action:string;resource:string;outcome:string;}
export interface RuntimeConfig {apiBase:string;defaultScope?:Partial<TenantScope>;}

export class DashboardApiError extends Error{
  constructor(public readonly status:number,public readonly code:string,message:string,public readonly correlationId?:string){super(message);this.name='DashboardApiError';}
}
function scopeHeaders(scope:TenantScope):Record<string,string>{const h:Record<string,string>={'x-qualyntra-organization-id':scope.organizationId};if(scope.workspaceId)h['x-qualyntra-workspace-id']=scope.workspaceId;if(scope.projectId)h['x-qualyntra-project-id']=scope.projectId;if(scope.environmentId)h['x-qualyntra-environment-id']=scope.environmentId;return h;}

export class DashboardApiClient{
  constructor(private readonly apiBase:string,private readonly getScope:()=>TenantScope){}
  async get<T>(path:string):Promise<T>{return this.request<T>('GET',path);}
  async post<T>(path:string,payload:unknown,idempotencyKey?:string):Promise<T>{return this.request<T>('POST',path,payload,idempotencyKey);}
  private async request<T>(method:string,path:string,payload?:unknown,idempotencyKey?:string):Promise<T>{
    const scope=this.getScope();if(!scope.organizationId.trim())throw new DashboardApiError(400,'scope_required','Organization is required before loading tenant data.');
    const headers:Record<string,string>={accept:'application/json',...scopeHeaders(scope),'x-correlation-id':crypto.randomUUID()};if(payload!==undefined)headers['content-type']='application/json';if(idempotencyKey)headers['idempotency-key']=idempotencyKey;
    const response=await fetch(`${this.apiBase}${path}`,{method,headers,body:payload===undefined?undefined:JSON.stringify(payload),credentials:'same-origin',redirect:'error'});
    const body=await response.json().catch(()=>({}));if(!response.ok){const error=(body as any)?.error??{};throw new DashboardApiError(response.status,error.code??'request_failed',error.message??`Request failed with HTTP ${response.status}.`,error.correlationId??response.headers.get('x-correlation-id')??undefined);}return body as T;
  }
}

export async function loadRuntimeConfig():Promise<RuntimeConfig>{const response=await fetch('/dashboard-config.json',{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw new Error('Dashboard runtime configuration could not be loaded.');return response.json() as Promise<RuntimeConfig>;}
export async function loadAuthStatus():Promise<{authenticated:boolean;actorId?:string}>{const response=await fetch('/auth/status',{credentials:'same-origin',cache:'no-store'});if(!response.ok)return{authenticated:false};return response.json() as Promise<{authenticated:boolean;actorId?:string}>;}
