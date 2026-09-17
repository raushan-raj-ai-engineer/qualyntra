/**
 * File: packages/identity/src/verifier.ts
 * Purpose: Verifies allowlisted JWT algorithms and OIDC claims against cached JWKS material with rotation-aware key refresh.
 * Author: Raushan Raj
 */
import { createPublicKey,verify as verifySignature } from 'node:crypto';
import type { JsonWebKey,JwtAlgorithm,OidcProviderConfiguration,VerifiedJwt } from '../../contracts/src/identity';
import { parseJwt } from './jwt';
import { OidcMetadataResolver } from './oidc-discovery';

function strings(value:unknown):string[]{return typeof value==='string'?[value]:Array.isArray(value)?value.filter((x):x is string=>typeof x==='string'):[];}
function numeric(value:unknown,name:string):number{if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`JWT ${name} claim must be numeric`);return value;}
function keyCompatible(key:JsonWebKey,alg:JwtAlgorithm):boolean{
  if(key.use&&key.use!=='sig')return false;if(key.alg&&key.alg!==alg)return false;
  return alg==='RS256'?key.kty==='RSA':key.kty==='EC'&&key.crv==='P-256';
}
function cryptoAlgorithm(alg:JwtAlgorithm):string{return alg==='RS256'?'RSA-SHA256':'sha256';}

export class OidcJwtVerifier{
  constructor(private readonly config:OidcProviderConfiguration,private readonly resolver:OidcMetadataResolver,private readonly nowSeconds:()=>number=()=>Math.floor(Date.now()/1000)){
    if(!config.id.trim())throw new Error('OIDC provider id is required');if(config.audiences.length===0)throw new Error('OIDC provider requires at least one audience');if(config.allowedAlgorithms.length===0)throw new Error('OIDC provider requires at least one allowed algorithm');
  }
  async verify(token:string):Promise<VerifiedJwt>{
    const parsed=parseJwt(token,this.config.maxTokenBytes);const alg=parsed.header.alg;if(typeof alg!=='string'||!this.config.allowedAlgorithms.includes(alg as JwtAlgorithm))throw new Error('JWT algorithm is not explicitly allowlisted');
    if(parsed.header.jku!==undefined||parsed.header.x5u!==undefined)throw new Error('JWT token-controlled key URLs are not accepted');
    if(Array.isArray(parsed.header.crit)&&parsed.header.crit.length>0)throw new Error('JWT critical JOSE extensions are not supported');
    const typ=parsed.header.typ;if(this.config.requireTokenType&&typeof typ!=='string')throw new Error('JWT typ header is required');
    if(typeof typ==='string'&&this.config.acceptedTokenTypes?.length&&!this.config.acceptedTokenTypes.some(value=>value.toLowerCase()===typ.toLowerCase()))throw new Error('JWT typ header is not accepted');
    const kid=parsed.header.kid;if(typeof kid!=='string'||!kid)throw new Error('JWT kid header is required');
    let key=await this.findKey(kid,alg as JwtAlgorithm,false);if(!key)key=await this.findKey(kid,alg as JwtAlgorithm,true);if(!key)throw new Error('JWT signing key was not found');
    const publicKey=createPublicKey({key:key as any,format:'jwk'} as any);const options:any=alg==='ES256'?{key:publicKey,dsaEncoding:'ieee-p1363'}:publicKey;
    if(!verifySignature(cryptoAlgorithm(alg as JwtAlgorithm),Buffer.from(parsed.signingInput),options,parsed.signature))throw new Error('JWT signature verification failed');
    return this.validateClaims(parsed.claims);
  }
  private async findKey(kid:string,alg:JwtAlgorithm,force:boolean):Promise<JsonWebKey|undefined>{const set=await this.resolver.keys(force);return set.keys.find(key=>key.kid===kid&&keyCompatible(key,alg));}
  private validateClaims(claims:Record<string,unknown>):VerifiedJwt{
    const issuer=claims.iss,subject=claims.sub;if(typeof issuer!=='string'||issuer!==this.config.issuer)throw new Error('JWT issuer does not match configured issuer');if(typeof subject!=='string'||!subject)throw new Error('JWT subject is required');
    const audiences=strings(claims.aud);if(!audiences.some(a=>this.config.audiences.includes(a)))throw new Error('JWT audience is not accepted');
    const now=this.nowSeconds(),skew=this.config.clockSkewSeconds,exp=numeric(claims.exp,'exp');if(now-skew>=exp)throw new Error('JWT is expired');
    if(claims.nbf!==undefined&&now+skew<numeric(claims.nbf,'nbf'))throw new Error('JWT is not active yet');
    let issuedAt:string|undefined;if(this.config.maxTokenAgeSeconds!==undefined&&claims.iat===undefined)throw new Error('JWT iat claim is required when maximum token age is configured');if(claims.iat!==undefined){const iat=numeric(claims.iat,'iat');if(iat>now+skew)throw new Error('JWT issued-at time is in the future');if(this.config.maxTokenAgeSeconds!==undefined&&now-iat-skew>this.config.maxTokenAgeSeconds)throw new Error('JWT exceeds maximum token age');issuedAt=new Date(iat*1000).toISOString();}
    for(const claim of this.config.requiredClaims??[])if(claims[claim]===undefined||claims[claim]===null)throw new Error(`JWT required claim is missing: ${claim}`);
    return{issuer,subject,audiences,expiresAt:new Date(exp*1000).toISOString(),issuedAt,tokenId:typeof claims.jti==='string'?claims.jti:undefined,claims:{...claims}};
  }
}
