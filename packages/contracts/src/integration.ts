/**
 * File: packages/contracts/src/integration.ts
 * Purpose: Defines vendor-neutral enterprise integration operations so external systems stay behind adapters.
 * Author: Raushan Raj
 */
import type { Adapter } from './adapter';
import type { TenantScope } from './governance';

export type IntegrationOperation='publish-status'|'create-work-item'|'comment'|'notify'|'custom';
export interface IntegrationRequest {
  operation:IntegrationOperation;
  scope:TenantScope;
  correlationId:string;
  payload:Record<string,unknown>;
}
export interface IntegrationResponse {
  ok:boolean;
  externalId?:string;
  uri?:string;
  metadata?:Record<string,unknown>;
}
export interface IntegrationAdapter extends Adapter {
  execute(request:IntegrationRequest):Promise<IntegrationResponse>;
}
