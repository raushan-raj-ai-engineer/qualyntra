/**
 * File: packages/agent/src/health-server.ts
 * Purpose: Exposes secret-free local liveness/readiness/status endpoints for container and orchestrator health checks.
 * Author: Raushan Raj
 */
import { createServer } from 'node:http';
import type { ExecutionAgentRuntime } from './runtime';
function send(res:any,status:number,body:unknown){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body));}
export function createExecutionAgentHealthServer(runtime:ExecutionAgentRuntime){return createServer((req:any,res:any)=>{const path=new URL(req.url??'/','http://localhost').pathname;const snapshot=runtime.snapshot();if(req.method==='GET'&&path==='/health'){send(res,snapshot.state==='stopped'?503:200,{status:snapshot.state==='stopped'?'stopped':'ok',workerId:snapshot.workerId});return;}if(req.method==='GET'&&path==='/ready'){send(res,snapshot.ready?200:503,{status:snapshot.ready?'ready':'not_ready',workerId:snapshot.workerId,activeJobs:snapshot.activeJobs,state:snapshot.state});return;}send(res,404,{error:'not_found'});});}
