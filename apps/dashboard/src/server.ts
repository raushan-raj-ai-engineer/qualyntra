/**
 * File: apps/dashboard/src/server.ts
 * Purpose: Serves the dashboard shell and a same-origin authenticated BFF proxy to the Qualyntra control plane with strict browser security headers.
 * Author: Raushan Raj
 */
import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { DashboardSessionResolver } from './session';

export interface DashboardScopeDefaults { organizationId?:string;workspaceId?:string;projectId?:string;environmentId?:string; }
export interface DashboardServerOptions{
  staticRoot:string;
  controlPlaneOrigin:string;
  sessionResolver:DashboardSessionResolver;
  fetcher?:(input:any,init?:any)=>Promise<any>;
  maxProxyBodyBytes?:number;
  maxProxyResponseBytes?:number;
  defaultScope?:DashboardScopeDefaults;
}

const SECURITY_HEADERS:Record<string,string>={
  'content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'referrer-policy':'no-referrer',
  'permissions-policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'x-content-type-options':'nosniff',
  'x-frame-options':'DENY',
  'cross-origin-opener-policy':'same-origin',
  'cross-origin-resource-policy':'same-origin',
};
const PASSTHROUGH_REQUEST_HEADERS=['accept','content-type','idempotency-key','x-correlation-id','x-qualyntra-organization-id','x-qualyntra-workspace-id','x-qualyntra-project-id','x-qualyntra-environment-id'];
const PASSTHROUGH_RESPONSE_HEADERS=['content-type','content-length','location','retry-after','x-request-id','x-correlation-id','x-ratelimit-remaining'];

function setSecurityHeaders(res:any):void{for(const [key,value] of Object.entries(SECURITY_HEADERS))res.setHeader(key,value);}
function json(res:any,status:number,body:unknown,headers:Record<string,string>={}):void{res.statusCode=status;res.setHeader('content-type','application/json; charset=utf-8');res.setHeader('cache-control','no-store');for(const [key,value] of Object.entries(headers))res.setHeader(key,value);res.end(JSON.stringify(body));}
function contentType(name:string):string{return name.endsWith('.html')?'text/html; charset=utf-8':name.endsWith('.css')?'text/css; charset=utf-8':name.endsWith('.js')?'text/javascript; charset=utf-8':name.endsWith('.map')?'application/json; charset=utf-8':'application/octet-stream';}
function normalizeOrigin(raw:string):URL{const value=new URL(raw);if(!['http:','https:'].includes(value.protocol))throw new Error('Dashboard control-plane origin must use HTTP or HTTPS.');if(value.username||value.password||value.pathname!=='/'||value.search||value.hash)throw new Error('Dashboard control-plane origin must not include credentials, path, query, or fragment.');if(value.protocol==='http:'&&!['127.0.0.1','localhost','::1'].includes(value.hostname))throw new Error('Dashboard control-plane origin must use HTTPS except on localhost.');return value;}
async function body(req:any,max:number):Promise<Uint8Array|undefined>{if(['GET','HEAD'].includes(req.method??'GET'))return undefined;const chunks:any[]=[];let bytes=0;for await(const chunk of req){const value=Buffer.from(chunk);bytes+=value.byteLength;if(bytes>max)throw Object.assign(new Error('Dashboard proxy request exceeds configured body limit.'),{statusCode:413});chunks.push(value);}return chunks.length?Buffer.concat(chunks):undefined;}
function requestHeaders(req:any,authorization:string):Record<string,string>{const result:Record<string,string>={authorization};for(const name of PASSTHROUGH_REQUEST_HEADERS){const value=req.headers?.[name];if(typeof value==='string'&&value)result[name]=value;}return result;}
function proxyPath(url:URL):string|undefined{const prefix='/dashboard-api';if(!url.pathname.startsWith(`${prefix}/`))return undefined;const pathValue=url.pathname.slice(prefix.length);if(!pathValue.startsWith('/api/v1/')&&pathValue!=='/api/v1/health'&&pathValue!=='/api/v1/ready')return undefined;return `${pathValue}${url.search}`;}
function enforceBrowserMutationOrigin(req:any):void{if(!['POST','PUT','PATCH','DELETE'].includes(req.method??'GET'))return;const fetchSite=req.headers?.['sec-fetch-site'];if(typeof fetchSite==='string'&&!['same-origin','none'].includes(fetchSite))throw Object.assign(new Error('Cross-site dashboard mutations are not allowed.'),{statusCode:403});const origin=req.headers?.origin;const host=req.headers?.host;if(typeof origin==='string'&&typeof host==='string'){let parsed:URL;try{parsed=new URL(origin);}catch{throw Object.assign(new Error('Dashboard mutation origin is invalid.'),{statusCode:403});}if(parsed.host!==host)throw Object.assign(new Error('Cross-origin dashboard mutations are not allowed.'),{statusCode:403});}}
async function boundedUpstreamBody(upstream:any,max:number):Promise<any>{const declared=Number(upstream.headers?.get?.('content-length')??'0');if(Number.isFinite(declared)&&declared>max)throw Object.assign(new Error('Control-plane response exceeds dashboard proxy limit.'),{statusCode:502});if(upstream.body&&typeof upstream.body[Symbol.asyncIterator]==='function'){const chunks:any[]=[];let bytes=0;for await(const chunk of upstream.body){const value=Buffer.from(chunk);bytes+=value.byteLength;if(bytes>max)throw Object.assign(new Error('Control-plane response exceeds dashboard proxy limit.'),{statusCode:502});chunks.push(value);}return Buffer.concat(chunks);}const value=Buffer.from(await upstream.arrayBuffer());if(value.byteLength>max)throw Object.assign(new Error('Control-plane response exceeds dashboard proxy limit.'),{statusCode:502});return value;}

export function createDashboardServer(options:DashboardServerOptions){
  const origin=normalizeOrigin(options.controlPlaneOrigin);const fetcher=options.fetcher??(globalThis as any).fetch;const maxBody=options.maxProxyBodyBytes??1_048_576;const maxResponse=options.maxProxyResponseBytes??10_485_760;
  if(typeof fetcher!=='function')throw new Error('Dashboard server requires a fetch implementation.');
  return createServer((req:any,res:any)=>{void(async()=>{
    setSecurityHeaders(res);
    try{
      const url=new URL(req.url??'/', 'http://localhost');
      if(req.method==='GET'&&url.pathname==='/dashboard-health'){json(res,200,{status:'ok'});return;}
      if(req.method==='GET'&&url.pathname==='/dashboard-config.json'){json(res,200,{apiBase:'/dashboard-api/api/v1',defaultScope:options.defaultScope??{}});return;}
      if(req.method==='GET'&&url.pathname==='/auth/status'){const session=await options.sessionResolver.resolve(req);json(res,200,{authenticated:Boolean(session),actorId:session?.actorId});return;}
      const proxied=proxyPath(url);
      if(url.pathname.startsWith('/dashboard-api/')&&!proxied){json(res,404,{error:{code:'not_found',message:'Dashboard API route was not found.'}});return;}
      if(proxied){
        if(!['GET','POST'].includes(req.method??'GET')){json(res,405,{error:{code:'method_not_allowed',message:'Dashboard API proxy allows GET and POST only.'}},{allow:'GET, POST'});return;}enforceBrowserMutationOrigin(req);
        const session=await options.sessionResolver.resolve(req);if(!session){json(res,401,{error:{code:'dashboard_session_required',message:'An authenticated dashboard session is required.'}});return;}
        const target=new URL(proxied,origin);const payload=await body(req,maxBody);const upstream=await fetcher(target,{method:req.method,headers:requestHeaders(req,session.authorization),body:payload,redirect:'manual'});const bytes=await boundedUpstreamBody(upstream,maxResponse);
        res.statusCode=upstream.status;for(const name of PASSTHROUGH_RESPONSE_HEADERS){const value=upstream.headers?.get?.(name);if(value)res.setHeader(name,value);}res.setHeader('cache-control','no-store');res.end(bytes);return;
      }
      if(req.method!=='GET'&&req.method!=='HEAD'){json(res,405,{error:{code:'method_not_allowed',message:'Dashboard shell accepts GET and HEAD only.'}},{allow:'GET, HEAD'});return;}
      const asset=url.pathname==='/'||!path.extname(url.pathname)?'index.html':url.pathname.slice(1);if(!['index.html','styles.css','app.js','api.js','ui.js'].includes(asset)){json(res,404,{error:{code:'not_found',message:'Dashboard asset was not found.'}});return;}
      const file=path.resolve(options.staticRoot,asset);const root=path.resolve(options.staticRoot)+path.sep;if(file!==path.resolve(options.staticRoot,'index.html')&&!file.startsWith(root)){json(res,404,{error:{code:'not_found',message:'Dashboard asset was not found.'}});return;}
      const bytes=await fs.readFile(file);res.statusCode=200;res.setHeader('content-type',contentType(asset));res.setHeader('cache-control',asset==='index.html'?'no-store':'public, max-age=300');if(req.method==='HEAD')res.end();else res.end(bytes);
    }catch(error:any){const status=Number(error?.statusCode)||500;json(res,status,{error:{code:status===413?'payload_too_large':'dashboard_error',message:status>=500?'Dashboard request failed.':String(error?.message??'Dashboard request failed.')}});}
  })();});
}
