/**
 * File: packages/identity/src/jwt.ts
 * Purpose: Parses compact JWTs without trusting unverified claims and enforces strict size/shape limits before cryptographic verification.
 * Author: Raushan Raj
 */

export interface ParsedJwt { header:Record<string,unknown>; claims:Record<string,unknown>; signingInput:string; signature:any; }
function decodeJson(segment:string,label:string):Record<string,unknown>{
  try{const value=JSON.parse(Buffer.from(segment,'base64url').toString('utf8'));if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value as Record<string,unknown>;}catch{throw new Error(`JWT ${label} must be a base64url encoded JSON object`);}
}
export function parseJwt(token:string,maxBytes:number):ParsedJwt{
  if(!token||Buffer.byteLength(token,'utf8')>maxBytes)throw new Error('JWT exceeds the configured size limit');
  const parts=token.split('.');if(parts.length!==3||parts.some(part=>!part))throw new Error('JWT must contain exactly three compact serialization segments');
  return{header:decodeJson(parts[0]!,'header'),claims:decodeJson(parts[1]!,'claims'),signingInput:`${parts[0]}.${parts[1]}`,signature:Buffer.from(parts[2]!,'base64url')};
}
export function unverifiedIssuer(token:string,maxBytes=16_384):string|undefined{try{const value=parseJwt(token,maxBytes).claims.iss;return typeof value==='string'?value:undefined;}catch{return undefined;}}
