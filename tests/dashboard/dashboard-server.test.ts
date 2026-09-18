/**
 * File: tests/dashboard/dashboard-server.test.ts
 * Purpose: Verifies dashboard static serving, browser security headers, authenticated BFF proxying, path restrictions, and secret-free runtime configuration.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';import path from 'node:path';
import { createDashboardServer } from '../../apps/dashboard/src/server';
import { BootstrapServiceSessionResolver,DisabledDashboardSessionResolver } from '../../apps/dashboard/src/session';

async function withServer(input:{session?:any;fetcher?:any;maxProxyBodyBytes?:number;maxProxyResponseBytes?:number;defaultScope?:any},fn:(base:string)=>Promise<void>){
  const server=createDashboardServer({staticRoot:path.resolve('dist/apps/dashboard/public'),controlPlaneOrigin:'http://127.0.0.1:4317',sessionResolver:input.session??new DisabledDashboardSessionResolver(),fetcher:input.fetcher??(async()=>{throw new Error('Unexpected upstream request');}),maxProxyBodyBytes:input.maxProxyBodyBytes,maxProxyResponseBytes:input.maxProxyResponseBytes,defaultScope:input.defaultScope});
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const address=server.address();const base=`http://127.0.0.1:${address.port}`;try{await fn(base);}finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
}

test('dashboard serves shell with strict browser security headers',async()=>withServer({},async base=>{const response=await fetch(`${base}/`);assert.equal(response.status,200);assert.match(await response.text(),/Qualyntra Dashboard/);assert.match(response.headers.get('content-security-policy')??'',/script-src 'self'/);assert.match(response.headers.get('content-security-policy')??'',/frame-ancestors 'none'/);assert.equal(response.headers.get('x-frame-options'),'DENY');assert.equal(response.headers.get('x-content-type-options'),'nosniff');assert.equal(response.headers.get('referrer-policy'),'no-referrer');}));

test('dashboard SPA routes fall back to the static shell',async()=>withServer({},async base=>{const response=await fetch(`${base}/runs`);assert.equal(response.status,200);assert.match(await response.text(),/id="app"/);}));

test('dashboard refuses unknown static assets rather than exposing filesystem paths',async()=>withServer({},async base=>{const response=await fetch(`${base}/package.json`);assert.equal(response.status,404);}));

test('dashboard API requires a server-side session',async()=>withServer({},async base=>{const response=await fetch(`${base}/dashboard-api/api/v1/runs`,{headers:{'x-qualyntra-organization-id':'org-a'}});assert.equal(response.status,401);const body:any=await response.json();assert.equal(body.error.code,'dashboard_session_required');}));

test('dashboard BFF injects upstream authorization and forwards only tenant/correlation headers',async()=>{let captured:any;await withServer({session:new BootstrapServiceSessionResolver('server-secret','svc-dashboard'),fetcher:async(url:any,init:any)=>{captured={url:String(url),init};return{status:200,headers:{get:(name:string)=>name==='x-request-id'?'req-upstream':name==='content-type'?'application/json':null},arrayBuffer:async()=>Buffer.from(JSON.stringify({items:[]}))};}},async base=>{const response=await fetch(`${base}/dashboard-api/api/v1/runs?limit=10`,{headers:{'x-qualyntra-organization-id':'org-a','x-correlation-id':'corr-a','x-not-forwarded':'nope'}});assert.equal(response.status,200);assert.equal(captured.url,'http://127.0.0.1:4317/api/v1/runs?limit=10');assert.equal(captured.init.headers.authorization,'Bearer server-secret');assert.equal(captured.init.headers['x-qualyntra-organization-id'],'org-a');assert.equal(captured.init.headers['x-correlation-id'],'corr-a');assert.equal(captured.init.headers['x-not-forwarded'],undefined);assert.equal(response.headers.get('x-request-id'),'req-upstream');});});

test('dashboard BFF refuses non-control-plane proxy paths',async()=>withServer({session:new BootstrapServiceSessionResolver('server-secret')},async base=>{const response=await fetch(`${base}/dashboard-api/internal/admin`);assert.equal(response.status,404);}));

test('dashboard BFF enforces request body limit before calling upstream',async()=>{let calls=0;await withServer({session:new BootstrapServiceSessionResolver('server-secret'),maxProxyBodyBytes:8,fetcher:async()=>{calls++;throw new Error('must not run');}},async base=>{const response=await fetch(`${base}/dashboard-api/api/v1/runs`,{method:'POST',headers:{'content-type':'application/json','x-qualyntra-organization-id':'org-a'},body:'123456789'});assert.equal(response.status,413);assert.equal(calls,0);});});

test('dashboard runtime config exposes scope defaults but never bootstrap credential material',async()=>withServer({session:new BootstrapServiceSessionResolver('do-not-expose'),defaultScope:{organizationId:'org-a',projectId:'project-a'}},async base=>{const response=await fetch(`${base}/dashboard-config.json`);const text=await response.text();assert.equal(response.status,200);assert.doesNotMatch(text,/do-not-expose/);const body=JSON.parse(text);assert.equal(body.apiBase,'/dashboard-api/api/v1');assert.equal(body.defaultScope.organizationId,'org-a');assert.equal(body.defaultScope.projectId,'project-a');}));

test('auth status reports only session state and actor identifier',async()=>withServer({session:new BootstrapServiceSessionResolver('hidden-token','svc-ui')},async base=>{const response=await fetch(`${base}/auth/status`);assert.deepEqual(await response.json(),{authenticated:true,actorId:'svc-ui'});}));


test('dashboard serves compiled ES module dependencies required by the browser entry',async()=>withServer({},async base=>{for(const asset of ['/app.js','/api.js','/ui.js']){const response=await fetch(`${base}${asset}`);assert.equal(response.status,200);assert.match(response.headers.get('content-type')??'',/javascript/);}}));

test('dashboard rejects cross-site browser mutations before resolving upstream',async()=>{let calls=0;await withServer({session:new BootstrapServiceSessionResolver('server-secret'),fetcher:async()=>{calls++;throw new Error('must not run');}},async base=>{const response=await fetch(`${base}/dashboard-api/api/v1/runs`,{method:'POST',headers:{'content-type':'application/json','x-qualyntra-organization-id':'org-a','sec-fetch-site':'cross-site','origin':'https://malicious.invalid'},body:'{}'});assert.equal(response.status,403);assert.equal(calls,0);});});

test('dashboard bounds upstream response bytes before returning them to the browser',async()=>withServer({session:new BootstrapServiceSessionResolver('server-secret'),fetcher:async()=>({status:200,headers:{get:(name:string)=>name==='content-length'?'100':name==='content-type'?'application/json':null},arrayBuffer:async()=>Buffer.from('{}')}),maxProxyResponseBytes:8},async base=>{const response=await fetch(`${base}/dashboard-api/api/v1/runs`,{headers:{'x-qualyntra-organization-id':'org-a'}});assert.equal(response.status,502);const payload:any=await response.json();assert.equal(payload.error.code,'dashboard_error');}));

test('dashboard rejects insecure non-loopback control-plane origins',()=>{assert.throws(()=>createDashboardServer({staticRoot:path.resolve('dist/apps/dashboard/public'),controlPlaneOrigin:'http://example.invalid',sessionResolver:new DisabledDashboardSessionResolver(),fetcher:async()=>({})}),/HTTPS outside localhost unless explicitly enabled for a trusted internal network/);});

test('dashboard permits explicitly opted-in internal HTTP control-plane origins',()=>{
  assert.doesNotThrow(()=>createDashboardServer({
    staticRoot:path.resolve('dist/apps/dashboard/public'),
    controlPlaneOrigin:'http://control-plane:4317',
    allowInsecureControlPlane:true,
    sessionResolver:new DisabledDashboardSessionResolver(),
    fetcher:async()=>({})
  }));
});
