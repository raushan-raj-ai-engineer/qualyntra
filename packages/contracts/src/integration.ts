/**
 * File: packages/contracts/src/integration.ts
 * Purpose: Defines vendor-neutral enterprise integration, idempotency, rate-limit, and webhook-verification contracts.
 * Author: Raushan Raj
 */
import type { Adapter } from './adapter';
import type { SecretReference,TenantScope } from './governance';

export type IntegrationOperation='publish-status'|'create-work-item'|'comment'|'trigger-build'|'notify'|'custom';
export type IntegrationStatus='pending'|'success'|'failure'|'error'|'cancelled'|'neutral';
export interface IntegrationRateLimit { remaining?:number; resetAt?:string; retryAfterMs?:number; }
export interface IntegrationRequest {
  operation:IntegrationOperation;
  scope:TenantScope;
  correlationId:string;
  actorId?:string;
  idempotencyKey?:string;
  payload:Record<string,unknown>;
}
export interface IntegrationResponse {
  ok:boolean;
  externalId?:string;
  uri?:string;
  requestId?:string;
  rateLimit?:IntegrationRateLimit;
  metadata?:Record<string,unknown>;
}
export interface IntegrationAdapter extends Adapter { execute(request:IntegrationRequest):Promise<IntegrationResponse>; }

export interface IntegrationCredentialConfiguration { reference:SecretReference; scheme:'bearer'|'basic-token'|'basic-user-token'|'custom'; username?:string; }
export interface WebhookVerificationRequest { body:string|Uint8Array; signature:string|undefined; secret:SecretReference; }
export interface WebhookVerificationResult { valid:boolean; algorithm:string; reason?:string; }
export interface WebhookVerifier { verify(request:WebhookVerificationRequest):Promise<WebhookVerificationResult>; }
