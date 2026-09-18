/**
 * File: apps/dashboard/src/main.ts
 * Purpose: Boots the standalone Qualyntra dashboard server with server-side bootstrap authentication for local development and injectable session architecture for enterprise deployments.
 * Author: Raushan Raj
 */
import path from 'node:path';
import { BootstrapServiceSessionResolver,FileBootstrapServiceSessionResolver } from './session';
import { createDashboardServer } from './server';

function integer(value:string|undefined,fallback:number,name:string,min:number,max:number):number{const parsed=Number(value??String(fallback));if(!Number.isInteger(parsed)||parsed<min||parsed>max)throw new Error(`${name} must be an integer between ${min} and ${max}`);return parsed;}
const host=process.env.QUALYNTRA_DASHBOARD_HOST??'127.0.0.1';
const port=integer(process.env.QUALYNTRA_DASHBOARD_PORT,4320,'QUALYNTRA_DASHBOARD_PORT',1,65535);
const controlPlaneOrigin=process.env.QUALYNTRA_DASHBOARD_CONTROL_PLANE_ORIGIN??`http://127.0.0.1:${process.env.QUALYNTRA_PORT??'4317'}`;
const allowInsecureControlPlane=['1','true','yes','on'].includes((process.env.QUALYNTRA_DASHBOARD_ALLOW_INSECURE_CONTROL_PLANE??'false').toLowerCase());
const dashboardTokenFile=process.env.QUALYNTRA_DASHBOARD_BOOTSTRAP_TOKEN_FILE?.trim();if(dashboardTokenFile&&process.env.QUALYNTRA_DASHBOARD_BOOTSTRAP_TOKEN?.trim())throw new Error('Configure only one of QUALYNTRA_DASHBOARD_BOOTSTRAP_TOKEN_FILE or QUALYNTRA_DASHBOARD_BOOTSTRAP_TOKEN.');
const sessionResolver=dashboardTokenFile?new FileBootstrapServiceSessionResolver(dashboardTokenFile,process.env.QUALYNTRA_DASHBOARD_BOOTSTRAP_ACTOR_ID??'dashboard-bootstrap'):new BootstrapServiceSessionResolver(process.env.QUALYNTRA_DASHBOARD_BOOTSTRAP_TOKEN,process.env.QUALYNTRA_DASHBOARD_BOOTSTRAP_ACTOR_ID??'dashboard-bootstrap');
const server=createDashboardServer({
  staticRoot:path.resolve(process.cwd(),'dist/apps/dashboard/public'),controlPlaneOrigin,allowInsecureControlPlane,sessionResolver,
  maxProxyBodyBytes:integer(process.env.QUALYNTRA_DASHBOARD_MAX_PROXY_BODY_BYTES,1_048_576,'QUALYNTRA_DASHBOARD_MAX_PROXY_BODY_BYTES',1024,10_485_760),
  maxProxyResponseBytes:integer(process.env.QUALYNTRA_DASHBOARD_MAX_PROXY_RESPONSE_BYTES,10_485_760,'QUALYNTRA_DASHBOARD_MAX_PROXY_RESPONSE_BYTES',1024,104_857_600),
  defaultScope:{organizationId:process.env.QUALYNTRA_DASHBOARD_ORGANIZATION_ID?.trim()||undefined,workspaceId:process.env.QUALYNTRA_DASHBOARD_WORKSPACE_ID?.trim()||undefined,projectId:process.env.QUALYNTRA_DASHBOARD_PROJECT_ID?.trim()||undefined,environmentId:process.env.QUALYNTRA_DASHBOARD_ENVIRONMENT_ID?.trim()||undefined}
});
server.listen(port,host,()=>console.log(`Qualyntra dashboard listening on ${host}:${port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
