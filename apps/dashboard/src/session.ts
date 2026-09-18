/**
 * File: apps/dashboard/src/session.ts
 * Purpose: Defines the server-side dashboard session boundary so browser code never needs control-plane or vendor credentials.
 * Author: Raushan Raj
 */
import { readSecretFile } from '../../../packages/security/src/file-secret';

export interface DashboardSession { authorization:string; actorId?:string; expiresAt?:string; }

export interface DashboardSessionResolver { resolve(request:any):Promise<DashboardSession|undefined>; }

export class DisabledDashboardSessionResolver implements DashboardSessionResolver{
  async resolve(_request:any):Promise<undefined>{return undefined;}
}

/** Local-development bootstrap only. The token remains server-side and is never returned to browser code. */
export class BootstrapServiceSessionResolver implements DashboardSessionResolver{
  constructor(private readonly token?:string,private readonly actorId='dashboard-bootstrap'){}
  async resolve(_request:any):Promise<DashboardSession|undefined>{const token=this.token?.trim();return token?{authorization:`Bearer ${token}`,actorId:this.actorId}:undefined;}
}


export interface DashboardSessionRecord { id:string; authorization:string; actorId?:string; expiresAt:string; }

export interface DashboardSessionStore { get(id:string):Promise<DashboardSessionRecord|undefined>; }

function cookies(headerValue:string|undefined):Record<string,string>{
  const result:Record<string,string>={};
  for(const part of (headerValue??'').split(';')){const index=part.indexOf('=');if(index<1)continue;const name=part.slice(0,index).trim();const value=part.slice(index+1).trim();if(name)result[name]=decodeURIComponent(value);}
  return result;
}

/** Resolves an opaque HttpOnly cookie to a server-side session record supplied by the deployment identity layer. */
export class CookieDashboardSessionResolver implements DashboardSessionResolver{
  constructor(private readonly store:DashboardSessionStore,private readonly cookieName='__Host-qualyntra-session'){}
  async resolve(request:any):Promise<DashboardSession|undefined>{
    const id=cookies(request.headers?.cookie)[this.cookieName];if(!id)return undefined;
    const record=await this.store.get(id);if(!record)return undefined;
    if(Date.parse(record.expiresAt)<=Date.now())return undefined;
    return{authorization:record.authorization,actorId:record.actorId,expiresAt:record.expiresAt};
  }
}

/** Production bootstrap option for file-mounted secrets. Prefer a real cookie/session identity integration for user-facing deployments. */
export class FileBootstrapServiceSessionResolver implements DashboardSessionResolver{
  constructor(private readonly tokenFile:string,private readonly actorId='dashboard-bootstrap'){}
  async resolve(_request:any):Promise<DashboardSession|undefined>{try{const token=await readSecretFile(this.tokenFile);return{authorization:`Bearer ${token}`,actorId:this.actorId};}catch{return undefined;}}
}
