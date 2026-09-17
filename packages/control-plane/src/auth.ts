/**
 * File: packages/control-plane/src/auth.ts
 * Purpose: Implements dependency-injected bearer authentication with constant-time token comparison and no identity-vendor coupling.
 * Author: Raushan Raj
 */
import { timingSafeEqual } from 'node:crypto';
import type { ActorIdentity } from '../../contracts/src/governance';
import type { ApiPrincipal,ControlPlaneAuthenticator } from '../../contracts/src/control-plane';

function bearer(header:string|undefined):string|undefined{
  if(!header)return undefined;
  const match=/^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1];
}
function safeEqual(left:string,right:string):boolean{
  const a=Buffer.from(left);const b=Buffer.from(right);
  return a.length===b.length&&timingSafeEqual(a,b);
}

export class StaticBearerAuthenticator implements ControlPlaneAuthenticator{
  constructor(private readonly token:string|undefined,private readonly actor:ActorIdentity|undefined){}
  configured():boolean{return Boolean(this.token&&this.actor);}
  async authenticate(input:{authorization?:string}):Promise<ApiPrincipal|undefined>{
    if(!this.configured())return undefined;
    const supplied=bearer(input.authorization);
    if(!supplied||!safeEqual(supplied,this.token!))return undefined;
    return {actor:structuredClone(this.actor!),authenticationMethod:'bearer'};
  }
}
