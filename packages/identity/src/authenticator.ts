/**
 * File: packages/identity/src/authenticator.ts
 * Purpose: Authenticates bearer JWTs against a preconfigured issuer set and maps verified claims to Qualyntra principals without trusting token-selected network locations.
 * Author: Raushan Raj
 */
import type { ApiPrincipal,ControlPlaneAuthenticator } from '../../contracts/src/control-plane';
import type { IdentityMappingPolicy,OidcProviderConfiguration } from '../../contracts/src/identity';
import { unverifiedIssuer } from './jwt';
import { IdentityMapper } from './mapper';
import { OidcJwtVerifier } from './verifier';

function bearer(header:string|undefined):string|undefined{if(!header)return undefined;const match=/^Bearer\s+(.+)$/i.exec(header.trim());return match?.[1];}
export interface OidcAuthenticatorProvider { configuration:OidcProviderConfiguration; verifier:OidcJwtVerifier; mapping:IdentityMappingPolicy; }

export class MultiIssuerOidcAuthenticator implements ControlPlaneAuthenticator{
  private readonly providers=new Map<string,OidcAuthenticatorProvider>();
  constructor(providers:OidcAuthenticatorProvider[]){for(const provider of providers){if(this.providers.has(provider.configuration.issuer))throw new Error(`Duplicate OIDC issuer: ${provider.configuration.issuer}`);this.providers.set(provider.configuration.issuer,provider);}}
  configured():boolean{return this.providers.size>0;}
  async authenticate(input:{authorization?:string}):Promise<ApiPrincipal|undefined>{
    const token=bearer(input.authorization);if(!token)return undefined;const issuer=unverifiedIssuer(token);if(!issuer)return undefined;const provider=this.providers.get(issuer);if(!provider)return undefined;
    try{const verified=await provider.verifier.verify(token);const identity=new IdentityMapper(provider.mapping).map(verified);return{actor:identity.actor,authenticationMethod:'oidc-jwt',identity:{issuer:identity.issuer,subject:identity.subject,expiresAt:identity.expiresAt,tokenId:identity.tokenId}};}catch{return undefined;}
  }
}

export class CompositeControlPlaneAuthenticator implements ControlPlaneAuthenticator{
  constructor(private readonly authenticators:ControlPlaneAuthenticator[]){ }
  configured():boolean{return this.authenticators.some(item=>item.configured());}
  async authenticate(input:{authorization?:string}):Promise<ApiPrincipal|undefined>{for(const authenticator of this.authenticators)if(authenticator.configured()){const principal=await authenticator.authenticate(input);if(principal)return principal;}return undefined;}
}
