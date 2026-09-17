/**
 * File: packages/integrations/src/utils.ts
 * Purpose: Provides vendor-neutral URL, payload, authentication, rate-limit, and status-normalization helpers for integration adapters.
 * Author: Raushan Raj
 */
import type { IntegrationRateLimit,IntegrationStatus } from '../../contracts/src/integration';
import type { SecretReference } from '../../contracts/src/governance';
import type { SecretResolverRegistry } from '../../security/src/secrets';

export function endpoint(baseUrl:string,path:string):string{const base=new URL(baseUrl);if(base.username||base.password)throw new Error('Integration base URL must not contain embedded credentials.');return`${base.toString().replace(/\/$/,'')}/${path.replace(/^\//,'')}`;}
export function requiredString(payload:Record<string,unknown>,key:string):string{const value=payload[key];if(typeof value!=='string'||!value.trim())throw new Error(`Integration payload requires non-empty ${key}`);return value.trim();}
export function optionalString(payload:Record<string,unknown>,key:string):string|undefined{const value=payload[key];return typeof value==='string'&&value.trim()?value.trim():undefined;}
export function requiredNumber(payload:Record<string,unknown>,key:string):number{const value=payload[key];if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`Integration payload requires numeric ${key}`);return value;}
export function encodeSegment(value:string):string{return encodeURIComponent(value);}
export async function bearerHeader(secrets:SecretResolverRegistry,reference:SecretReference):Promise<string>{return`Bearer ${await secrets.resolve(reference)}`;}
export async function basicHeader(secrets:SecretResolverRegistry,reference:SecretReference,username=''):Promise<string>{return`Basic ${Buffer.from(`${username}:${await secrets.resolve(reference)}`).toString('base64')}`;}
export function normalizeStatus(value:unknown):IntegrationStatus{const status=String(value??'').trim().toLowerCase();if(['pass','passed','succeeded','success'].includes(status))return'success';if(['fail','failed','failure'].includes(status))return'failure';if(['pending','in_progress','in-progress','running'].includes(status))return'pending';if(['error'].includes(status))return'error';if(['cancelled','canceled'].includes(status))return'cancelled';if(['neutral','skipped'].includes(status))return'neutral';throw new Error(`Unsupported integration status: ${String(value)}`);}
export function rateLimit(headers:Record<string,string>):IntegrationRateLimit|undefined{const remaining=numberHeader(headers,'x-ratelimit-remaining');const reset=numberHeader(headers,'x-ratelimit-reset');const retry=numberHeader(headers,'retry-after');if(remaining===undefined&&reset===undefined&&retry===undefined)return undefined;return{remaining,resetAt:reset===undefined?undefined:new Date(reset*1000).toISOString(),retryAfterMs:retry===undefined?undefined:retry*1000};}
function numberHeader(headers:Record<string,string>,key:string):number|undefined{const value=headers[key];if(value===undefined)return undefined;const parsed=Number(value);return Number.isFinite(parsed)?parsed:undefined;}
