/**
 * File: packages/integrations/src/http.ts
 * Purpose: Provides injectable enterprise-integration HTTP transport, bounded timeouts, and secret-safe normalized failures.
 * Author: Raushan Raj
 */
export type IntegrationHttpMethod='GET'|'POST'|'PATCH'|'PUT'|'DELETE';
export interface IntegrationHttpRequest { adapterId:string; url:string; method:IntegrationHttpMethod; headers:Record<string,string>; body?:string; timeoutMs?:number; }
export interface IntegrationHttpResponse { status:number; headers:Record<string,string>; body:unknown; }
export interface IntegrationHttpTransport { request(request:IntegrationHttpRequest):Promise<IntegrationHttpResponse>; }

export class IntegrationHttpError extends Error{
  constructor(message:string,readonly adapterId:string,readonly status?:number,readonly retryable=false,readonly requestId?:string,readonly retryAfterMs?:number){super(message);this.name='IntegrationHttpError';}
}
function normalizeHeaders(headers:Headers):Record<string,string>{const result:Record<string,string>={};headers.forEach((value,key)=>{result[key.toLowerCase()]=value;});return result;}
function parseBody(text:string):unknown{if(!text)return undefined;try{return JSON.parse(text);}catch{return text;}}
function retryAfterMs(headers:Record<string,string>):number|undefined{const value=headers['retry-after'];if(!value)return undefined;const seconds=Number(value);if(Number.isFinite(seconds)&&seconds>=0)return seconds*1000;const at=Date.parse(value);return Number.isFinite(at)?Math.max(0,at-Date.now()):undefined;}
export function isRetryableIntegrationStatus(status:number):boolean{return status===408||status===425||status===429||status>=500;}
export class FetchIntegrationHttpTransport implements IntegrationHttpTransport{
  async request(request:IntegrationHttpRequest):Promise<IntegrationHttpResponse>{
    const controller=new AbortController();const timer=request.timeoutMs&&request.timeoutMs>0?setTimeout(()=>controller.abort(),request.timeoutMs):undefined;
    try{
      let response:Response;
      try{response=await fetch(request.url,{method:request.method,headers:request.headers,body:request.body,signal:controller.signal});}
      catch(error){throw new IntegrationHttpError(`Integration ${request.adapterId} request failed before receiving an HTTP response.`,request.adapterId,undefined,true);}
      const headers=normalizeHeaders(response.headers);const text=await response.text();const body=parseBody(text);
      if(!response.ok)throw new IntegrationHttpError(`Integration ${request.adapterId} returned HTTP ${response.status}.`,request.adapterId,response.status,isRetryableIntegrationStatus(response.status),headers['x-request-id']??headers['x-github-request-id']??headers['x-vss-e2eid'],retryAfterMs(headers));
      return{status:response.status,headers,body};
    }finally{if(timer)clearTimeout(timer);}
  }
}
export function asIntegrationRecord(value:unknown):Record<string,any>{return value&&typeof value==='object'?value as Record<string,any>:{};}
