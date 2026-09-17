/**
 * File: packages/identity/src/oidc-discovery.ts
 * Purpose: Resolves and caches OIDC discovery/JWKS documents while enforcing issuer matching, network policy, and SSRF-resistant URL rules.
 * Author: Raushan Raj
 */
import type { NetworkPolicy } from '../../contracts/src/configuration';
import type { IdentityHttpTransport,JsonWebKeySet,OidcDiscoveryDocument,OidcProviderConfiguration } from '../../contracts/src/identity';
import { assertNetworkAllowed } from '../../security/src/network-policy';

interface Cached<T>{value:T;expiresAt:number;}
function record(value:unknown):Record<string,any>{if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('OIDC response must be a JSON object');return value as Record<string,any>;}
function secureUrl(value:string,allowLocal:boolean,allowQuery=false):URL{
  const url=new URL(value);const local=['localhost','127.0.0.1','::1'].includes(url.hostname);
  if(url.username||url.password)throw new Error('OIDC URLs must not contain embedded credentials');
  if(url.protocol!=='https:'&&!(allowLocal&&local&&url.protocol==='http:'))throw new Error('OIDC URLs must use HTTPS except explicitly allowed localhost development');
  if(url.hash||(!allowQuery&&url.search))throw new Error('OIDC issuer/discovery URLs must not contain query or fragment components');
  return url;
}
function discoveryUrl(config:OidcProviderConfiguration):string{
  if(config.discoveryUrl)return secureUrl(config.discoveryUrl,Boolean(config.allowInsecureLocalhost)).toString();
  const issuer=secureUrl(config.issuer,Boolean(config.allowInsecureLocalhost)).toString().replace(/\/$/,'');
  return `${issuer}/.well-known/openid-configuration`;
}

export class OidcMetadataResolver{
  private metadata?:Cached<OidcDiscoveryDocument>;private jwks?:Cached<JsonWebKeySet>;
  constructor(private readonly config:OidcProviderConfiguration,private readonly transport:IdentityHttpTransport,private readonly network:NetworkPolicy,private readonly now:()=>number=()=>Date.now()){}
  async discovery(force=false):Promise<OidcDiscoveryDocument>{
    if(!force&&this.metadata&&this.metadata.expiresAt>this.now())return this.metadata.value;
    const url=discoveryUrl(this.config);assertNetworkAllowed(url,this.network);const response=await this.transport.get({url,timeoutMs:this.config.requestTimeoutMs});
    if(response.status<200||response.status>=300)throw new Error(`OIDC discovery failed with HTTP ${response.status}`);
    const body=record(response.body);if(typeof body.issuer!=='string'||typeof body.jwks_uri!=='string')throw new Error('OIDC discovery must contain issuer and jwks_uri');
    if(body.issuer!==this.config.issuer)throw new Error('OIDC discovery issuer does not exactly match configured issuer');
    const jwksUrl=secureUrl(body.jwks_uri,Boolean(this.config.allowInsecureLocalhost),true).toString();assertNetworkAllowed(jwksUrl,this.network);
    const document:OidcDiscoveryDocument={issuer:body.issuer,jwks_uri:jwksUrl,authorization_endpoint:typeof body.authorization_endpoint==='string'?body.authorization_endpoint:undefined,token_endpoint:typeof body.token_endpoint==='string'?body.token_endpoint:undefined,id_token_signing_alg_values_supported:Array.isArray(body.id_token_signing_alg_values_supported)?body.id_token_signing_alg_values_supported.filter((x:unknown)=>typeof x==='string'):undefined};
    this.metadata={value:document,expiresAt:this.now()+this.config.jwksCacheTtlSeconds*1000};return document;
  }
  async keys(force=false):Promise<JsonWebKeySet>{
    if(!force&&this.jwks&&this.jwks.expiresAt>this.now())return this.jwks.value;
    const metadata=await this.discovery(force);assertNetworkAllowed(metadata.jwks_uri,this.network);const response=await this.transport.get({url:metadata.jwks_uri,timeoutMs:this.config.requestTimeoutMs});
    if(response.status<200||response.status>=300)throw new Error(`OIDC JWKS retrieval failed with HTTP ${response.status}`);
    const body=record(response.body);if(!Array.isArray(body.keys)||body.keys.length===0)throw new Error('OIDC JWKS must contain at least one key');
    const keys:JsonWebKeySet={keys:body.keys.filter((x:unknown)=>x&&typeof x==='object'&&!Array.isArray(x))};if(keys.keys.length===0)throw new Error('OIDC JWKS contains no usable keys');
    this.jwks={value:keys,expiresAt:this.now()+this.config.jwksCacheTtlSeconds*1000};return keys;
  }
  clear():void{this.metadata=undefined;this.jwks=undefined;}
}
