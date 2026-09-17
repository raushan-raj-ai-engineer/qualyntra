/**
 * File: packages/integrations/src/retry.ts
 * Purpose: Implements bounded retries for explicitly idempotent integration mutations while avoiding duplicate unsafe side effects.
 * Author: Raushan Raj
 */
import { IntegrationHttpError } from './http';
export interface IntegrationRetryPolicy{maxAttempts:number;baseDelayMs:number;maxDelayMs:number;jitterRatio:number;}
export const DEFAULT_INTEGRATION_RETRY_POLICY:IntegrationRetryPolicy={maxAttempts:2,baseDelayMs:100,maxDelayMs:2000,jitterRatio:0.2};
export function retryDelay(attempt:number,policy=DEFAULT_INTEGRATION_RETRY_POLICY,random=Math.random):number{const bounded=Math.min(policy.maxDelayMs,policy.baseDelayMs*Math.pow(2,Math.max(0,attempt-1)));const jitter=bounded*policy.jitterRatio*(random()*2-1);return Math.max(0,Math.round(bounded+jitter));}
export async function withIntegrationRetry<T>(action:()=>Promise<T>,options:{idempotent:boolean;policy?:IntegrationRetryPolicy;sleep?:(ms:number)=>Promise<void>}):Promise<T>{const policy=options.policy??DEFAULT_INTEGRATION_RETRY_POLICY;let last:unknown;for(let attempt=1;attempt<=policy.maxAttempts;attempt++){try{return await action();}catch(error){last=error;const retryable=error instanceof IntegrationHttpError&&error.retryable;if(!options.idempotent||!retryable||attempt>=policy.maxAttempts)throw error;const delay=error instanceof IntegrationHttpError&&error.retryAfterMs!==undefined?Math.min(error.retryAfterMs,policy.maxDelayMs):retryDelay(attempt,policy);await(options.sleep??(ms=>new Promise(resolve=>setTimeout(resolve,ms))))(delay);}}throw last;}
