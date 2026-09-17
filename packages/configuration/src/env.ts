/**
 * File: packages/configuration/src/env.ts
 * Purpose: Loads runtime and control-plane configuration from environment variables with safe defaults and no embedded credentials.
 * Author: Raushan Raj
 */
import type { PlatformConfiguration } from '../../contracts/src/configuration';
function list(value:string|undefined):string[]{ return value?.split(',').map(v=>v.trim()).filter(Boolean)??[]; }
function bool(value:string|undefined,fallback:boolean):boolean { if(value===undefined)return fallback; return ['1','true','yes','on'].includes(value.toLowerCase()); }
function integer(value:string|undefined,fallback:number,name:string,min:number,max:number):number{const parsed=Number(value??String(fallback));if(!Number.isInteger(parsed)||parsed<min||parsed>max)throw new Error(`${name} must be an integer between ${min} and ${max}`);return parsed;}
export function loadConfiguration(env:Record<string,string|undefined> = process.env):PlatformConfiguration {
  const port=integer(env.QUALYNTRA_PORT,4317,'QUALYNTRA_PORT',1,65535);
  return {
    host:env.QUALYNTRA_HOST??'127.0.0.1',
    port,
    dataDir:env.QUALYNTRA_DATA_DIR??'.qualyntra',
    logLevel:(env.QUALYNTRA_LOG_LEVEL as PlatformConfiguration['logLevel'])??'info',
    defaultProvider:env.QUALYNTRA_DEFAULT_PROVIDER??'mock',
    security:{network:{allowNetwork:bool(env.QUALYNTRA_ALLOW_NETWORK,false),allowedHosts:list(env.QUALYNTRA_ALLOWED_HOSTS)},redactKeys:list(env.QUALYNTRA_REDACT_KEYS??'authorization,api-key,apikey,token,password,secret'),persistPrompts:bool(env.QUALYNTRA_PERSIST_PROMPTS,false)},
    controlPlane:{maxBodyBytes:integer(env.QUALYNTRA_API_MAX_BODY_BYTES,1_048_576,'QUALYNTRA_API_MAX_BODY_BYTES',1_024,10_485_760),maxPageSize:integer(env.QUALYNTRA_API_MAX_PAGE_SIZE,100,'QUALYNTRA_API_MAX_PAGE_SIZE',1,1000),rateLimitPerMinute:integer(env.QUALYNTRA_API_RATE_LIMIT_PER_MINUTE,120,'QUALYNTRA_API_RATE_LIMIT_PER_MINUTE',1,100_000),corsOrigins:list(env.QUALYNTRA_API_CORS_ORIGINS)},
  };
}
