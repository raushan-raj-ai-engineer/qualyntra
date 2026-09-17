/**
 * File: packages/control-plane/src/http.ts
 * Purpose: Provides bounded JSON parsing, tenant-scope extraction, pagination validation, CORS helpers, and safe response utilities for the control-plane API.
 * Author: Raushan Raj
 */
import type { TenantScope } from '../../contracts/src/governance';
import type { PageRequest } from '../../contracts/src/control-plane';
import { ApiError } from './errors';

export function header(req:any,name:string):string|undefined{const value=req.headers?.[name.toLowerCase()];return Array.isArray(value)?value[0]:typeof value==='string'?value:undefined;}
export function tenantScope(req:any):TenantScope{
  const organizationId=header(req,'x-qualyntra-organization-id');
  if(!organizationId?.trim())throw new ApiError(400,'tenant_context_required','x-qualyntra-organization-id is required.');
  return{organizationId:organizationId.trim(),workspaceId:header(req,'x-qualyntra-workspace-id')?.trim()||undefined,projectId:header(req,'x-qualyntra-project-id')?.trim()||undefined,environmentId:header(req,'x-qualyntra-environment-id')?.trim()||undefined};
}
export function pagination(url:URL,maxLimit=100):PageRequest{
  const offset=Number(url.searchParams.get('offset')??'0');const defaultLimit=Math.min(50,maxLimit);const limit=Number(url.searchParams.get('limit')??String(defaultLimit));
  if(!Number.isInteger(offset)||offset<0)throw new ApiError(400,'invalid_pagination','offset must be a non-negative integer.');
  if(!Number.isInteger(limit)||limit<1||limit>maxLimit)throw new ApiError(400,'invalid_pagination',`limit must be between 1 and ${maxLimit}.`);
  return{offset,limit};
}
export async function readJson(req:any,maxBytes:number):Promise<unknown>{
  const declared=Number(header(req,'content-length')??'0');if(Number.isFinite(declared)&&declared>maxBytes)throw new ApiError(413,'payload_too_large','Request body exceeds the configured size limit.');
  const chunks:any[]=[];let size=0;
  for await(const chunk of req){const buffer=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);size+=buffer.length;if(size>maxBytes)throw new ApiError(413,'payload_too_large','Request body exceeds the configured size limit.');chunks.push(buffer);}
  if(size===0)return{};
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new ApiError(400,'invalid_json','Request body must contain valid JSON.');}
}
export function json(res:any,status:number,body:unknown,headers:Record<string,string>={}):void{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers});res.end(JSON.stringify(body));}
export function applyCors(req:any,res:any,allowedOrigins:string[]):boolean{
  const origin=header(req,'origin');if(origin&&allowedOrigins.includes(origin)){res.setHeader('access-control-allow-origin',origin);res.setHeader('vary','Origin');res.setHeader('access-control-allow-credentials','true');}
  if(req.method==='OPTIONS'){
    res.setHeader('access-control-allow-methods','GET,POST,PUT,OPTIONS');
    res.setHeader('access-control-allow-headers','authorization,content-type,idempotency-key,x-correlation-id,x-qualyntra-organization-id,x-qualyntra-workspace-id,x-qualyntra-project-id,x-qualyntra-environment-id');
    res.writeHead(204);res.end();return true;
  }
  return false;
}
