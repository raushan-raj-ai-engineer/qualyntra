/**
 * File: packages/configuration/src/env.ts
 * Purpose: Loads runtime configuration from environment variables with safe defaults and no embedded credentials.
 * Author: Raushan Raj
 */
import type { PlatformConfiguration } from '../../contracts/src/configuration';
function list(value:string|undefined):string[]{ return value?.split(',').map(v=>v.trim()).filter(Boolean)??[]; }
function bool(value:string|undefined,fallback:boolean):boolean { if(value===undefined)return fallback; return ['1','true','yes','on'].includes(value.toLowerCase()); }
export function loadConfiguration(env:Record<string,string|undefined> = process.env):PlatformConfiguration { const port=Number(env.QUALYNTRA_PORT??'4317'); if(!Number.isInteger(port)||port<1||port>65535) throw new Error('QUALYNTRA_PORT must be a valid TCP port'); return { host:env.QUALYNTRA_HOST??'127.0.0.1', port, dataDir:env.QUALYNTRA_DATA_DIR??'.qualyntra', logLevel:(env.QUALYNTRA_LOG_LEVEL as PlatformConfiguration['logLevel'])??'info', defaultProvider:env.QUALYNTRA_DEFAULT_PROVIDER??'mock', security:{ network:{allowNetwork:bool(env.QUALYNTRA_ALLOW_NETWORK,false),allowedHosts:list(env.QUALYNTRA_ALLOWED_HOSTS)}, redactKeys:list(env.QUALYNTRA_REDACT_KEYS??'authorization,api-key,apikey,token,password,secret'), persistPrompts:bool(env.QUALYNTRA_PERSIST_PROMPTS,false)} }; }

