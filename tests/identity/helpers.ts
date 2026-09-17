/**
 * File: tests/identity/helpers.ts
 * Purpose: Provides deterministic in-process RSA/OIDC fixtures for enterprise-identity tests without live identity-provider dependencies.
 * Author: Raushan Raj
 */
import { generateKeyPairSync,sign } from 'node:crypto';
import type { IdentityHttpRequest,IdentityHttpResponse,IdentityHttpTransport,JsonWebKey,OidcProviderConfiguration } from '../../packages/contracts/src/identity';

export const issuer='https://issuer.example/tenant';
export const audience='qualyntra-api';
const pair=generateKeyPairSync('rsa',{modulusLength:2048,publicExponent:0x10001});
export const publicJwk={...(pair.publicKey.export({format:'jwk'}) as any),kid:'key-1',use:'sig',alg:'RS256'} as JsonWebKey;

function encode(value:unknown):string{return Buffer.from(JSON.stringify(value)).toString('base64url');}
export function signedToken(claims:Record<string,unknown>,header:Record<string,unknown>={alg:'RS256',kid:'key-1',typ:'JWT'}):string{
  const input=`${encode(header)}.${encode(claims)}`;const signature=sign('RSA-SHA256',Buffer.from(input),pair.privateKey);return `${input}.${signature.toString('base64url')}`;
}
export function claims(overrides:Record<string,unknown>={}):Record<string,unknown>{const now=Math.floor(Date.now()/1000);return{iss:issuer,sub:'user-1',aud:audience,iat:now-10,exp:now+300,groups:['qe-admins'],qualyntra_org:'org-1',name:'Quality User',jti:'token-1',...overrides};}
export const providerConfig:OidcProviderConfiguration={id:'test-oidc',issuer,audiences:[audience],allowedAlgorithms:['RS256'],clockSkewSeconds:30,jwksCacheTtlSeconds:300,requestTimeoutMs:1000,maxTokenBytes:16384,acceptedTokenTypes:['JWT','at+jwt'],requireTokenType:false};

export class FakeIdentityTransport implements IdentityHttpTransport{
  calls:string[]=[];jwksCalls=0;
  constructor(public metadataIssuer=issuer,public keys:JsonWebKey[]=[publicJwk]){}
  async get(request:IdentityHttpRequest):Promise<IdentityHttpResponse>{this.calls.push(request.url);if(request.url.includes('.well-known'))return{status:200,headers:{},body:{issuer:this.metadataIssuer,jwks_uri:`${issuer}/jwks`}};this.jwksCalls++;return{status:200,headers:{},body:{keys:this.keys}};}
}
