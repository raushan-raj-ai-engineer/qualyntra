/**
 * File: packages/agent/src/config.ts
 * Purpose: Loads and validates standalone execution-agent configuration without persisting credentials.
 * Author: Raushan Raj
 */
import type { TenantScope } from '../../contracts/src/governance';

export interface ExecutionAgentConfiguration {
  controlPlaneOrigin:string;
  scope:TenantScope;
  dataDir:string;
  workspaceRoot:string;
  secretRoot:string;
  tokenFile?:string;
  token?:string;
  healthHost:string;
  healthPort:number;
  pollMs:number;
  heartbeatMs:number;
  leaseMs:number;
  workerStaleMs:number;
  retryDelayMs:number;
  maxConcurrency:number;
  maxWorkspaceBytes:number;
  shutdownGraceMs:number;
  cleanupWorkspaces:boolean;
  labels:string[];
  languages:string[];
  engines:string[];
  runnerIds:string[];
  allowEnvSecrets:boolean;
}
function list(value:string|undefined):string[]{return value?.split(',').map(v=>v.trim()).filter(Boolean)??[];}
function bool(value:string|undefined,fallback:boolean):boolean{return value===undefined?fallback:['1','true','yes','on'].includes(value.toLowerCase());}
function integer(value:string|undefined,fallback:number,name:string,min:number,max:number):number{const parsed=Number(value??String(fallback));if(!Number.isInteger(parsed)||parsed<min||parsed>max)throw new Error(`${name} must be an integer between ${min} and ${max}`);return parsed;}
function secureOrigin(value:string):string{const url=new URL(value);const local=['localhost','127.0.0.1','::1'].includes(url.hostname);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&local))throw new Error('QUALYNTRA_AGENT_CONTROL_PLANE_ORIGIN must use HTTPS outside localhost.');return url.origin;}
export function loadExecutionAgentConfiguration(env:Record<string,string|undefined>=process.env):ExecutionAgentConfiguration{
  const organizationId=env.QUALYNTRA_AGENT_ORGANIZATION_ID?.trim();if(!organizationId)throw new Error('QUALYNTRA_AGENT_ORGANIZATION_ID is required.');
  const token=env.QUALYNTRA_AGENT_TOKEN?.trim()||undefined;const tokenFile=env.QUALYNTRA_AGENT_TOKEN_FILE?.trim()||undefined;if(!token&&!tokenFile)throw new Error('QUALYNTRA_AGENT_TOKEN_FILE or QUALYNTRA_AGENT_TOKEN is required.');if(token&&tokenFile)throw new Error('Configure only one of QUALYNTRA_AGENT_TOKEN_FILE or QUALYNTRA_AGENT_TOKEN.');
  const leaseMs=integer(env.QUALYNTRA_AGENT_LEASE_MS,30_000,'QUALYNTRA_AGENT_LEASE_MS',5_000,300_000);const heartbeatMs=integer(env.QUALYNTRA_AGENT_HEARTBEAT_MS,Math.max(1_000,Math.floor(leaseMs/3)),'QUALYNTRA_AGENT_HEARTBEAT_MS',1_000,120_000);if(heartbeatMs>=leaseMs)throw new Error('QUALYNTRA_AGENT_HEARTBEAT_MS must be less than QUALYNTRA_AGENT_LEASE_MS.');
  const workspaceId=env.QUALYNTRA_AGENT_WORKSPACE_ID?.trim()||undefined;const projectId=env.QUALYNTRA_AGENT_PROJECT_ID?.trim()||undefined;const environmentId=env.QUALYNTRA_AGENT_ENVIRONMENT_ID?.trim()||undefined;if(projectId&&!workspaceId)throw new Error('QUALYNTRA_AGENT_PROJECT_ID requires QUALYNTRA_AGENT_WORKSPACE_ID.');if(environmentId&&!projectId)throw new Error('QUALYNTRA_AGENT_ENVIRONMENT_ID requires QUALYNTRA_AGENT_PROJECT_ID.');
  const dataDir=env.QUALYNTRA_AGENT_DATA_DIR?.trim()||'.qualyntra-agent';
  return{controlPlaneOrigin:secureOrigin(env.QUALYNTRA_AGENT_CONTROL_PLANE_ORIGIN?.trim()||'http://127.0.0.1:4317'),scope:{organizationId,workspaceId,projectId,environmentId},dataDir,workspaceRoot:env.QUALYNTRA_AGENT_WORKSPACE_ROOT?.trim()||`${dataDir}/work`,secretRoot:env.QUALYNTRA_AGENT_SECRET_ROOT?.trim()||'/run/secrets',tokenFile,token,healthHost:env.QUALYNTRA_AGENT_HEALTH_HOST?.trim()||'127.0.0.1',healthPort:integer(env.QUALYNTRA_AGENT_HEALTH_PORT,4321,'QUALYNTRA_AGENT_HEALTH_PORT',1,65535),pollMs:integer(env.QUALYNTRA_AGENT_POLL_MS,1_000,'QUALYNTRA_AGENT_POLL_MS',100,60_000),heartbeatMs,leaseMs,workerStaleMs:integer(env.QUALYNTRA_AGENT_WORKER_STALE_MS,60_000,'QUALYNTRA_AGENT_WORKER_STALE_MS',leaseMs,900_000),retryDelayMs:integer(env.QUALYNTRA_AGENT_RETRY_DELAY_MS,1_000,'QUALYNTRA_AGENT_RETRY_DELAY_MS',0,300_000),maxConcurrency:integer(env.QUALYNTRA_AGENT_MAX_CONCURRENCY,1,'QUALYNTRA_AGENT_MAX_CONCURRENCY',1,128),maxWorkspaceBytes:integer(env.QUALYNTRA_AGENT_MAX_WORKSPACE_BYTES,2_147_483_648,'QUALYNTRA_AGENT_MAX_WORKSPACE_BYTES',1_048_576,107_374_182_400),shutdownGraceMs:integer(env.QUALYNTRA_AGENT_SHUTDOWN_GRACE_MS,30_000,'QUALYNTRA_AGENT_SHUTDOWN_GRACE_MS',1_000,900_000),cleanupWorkspaces:bool(env.QUALYNTRA_AGENT_CLEANUP_WORKSPACES,true),labels:list(env.QUALYNTRA_AGENT_LABELS),languages:list(env.QUALYNTRA_AGENT_LANGUAGES),engines:list(env.QUALYNTRA_AGENT_ENGINES),runnerIds:list(env.QUALYNTRA_AGENT_RUNNERS),allowEnvSecrets:bool(env.QUALYNTRA_AGENT_ALLOW_ENV_SECRETS,false)};
}
