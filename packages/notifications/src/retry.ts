/**
 * File: packages/notifications/src/retry.ts
 * Purpose: Retries idempotent notification delivery on bounded transient failures with exponential backoff.
 * Author: Raushan Raj
 */
import { NotificationHttpError } from './http';
export interface NotificationRetryPolicy { maxAttempts:number;baseDelayMs:number;maxDelayMs:number; }
const DEFAULT_POLICY:NotificationRetryPolicy={maxAttempts:3,baseDelayMs:100,maxDelayMs:2000};
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
export async function withNotificationRetry<T>(operation:()=>Promise<T>,idempotent:boolean,policy:NotificationRetryPolicy=DEFAULT_POLICY,sleeper:(ms:number)=>Promise<unknown>=sleep):Promise<T>{if(!Number.isInteger(policy.maxAttempts)||policy.maxAttempts<1)throw new Error('maxAttempts must be at least 1');let last:unknown;for(let attempt=1;attempt<=policy.maxAttempts;attempt++){try{return await operation();}catch(error){last=error;const retryable=idempotent&&error instanceof NotificationHttpError&&error.retryable;if(!retryable||attempt===policy.maxAttempts)throw error;const backoff=Math.min(policy.maxDelayMs,policy.baseDelayMs*2**(attempt-1));await sleeper(Math.max(backoff,error.retryAfterMs??0));}}throw last;}
