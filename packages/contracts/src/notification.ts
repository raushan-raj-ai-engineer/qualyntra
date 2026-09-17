/**
 * File: packages/contracts/src/notification.ts
 * Purpose: Defines vendor-neutral notification messages and adapter contracts for operational alerts.
 * Author: Raushan Raj
 */
import type { Adapter } from './adapter';
import type { TenantScope } from './governance';
import type { AlertSeverity } from './observability';

export interface NotificationLink { label:string; url:string; }
export interface NotificationRequest {
  id:string;
  title:string;
  message:string;
  severity:AlertSeverity;
  scope:TenantScope;
  correlationId?:string;
  dedupeKey?:string;
  attributes?:Record<string,string|number|boolean>;
  links?:NotificationLink[];
}
export interface NotificationResponse { ok:boolean; externalId?:string; requestId?:string; metadata?:Record<string,unknown>; }
export interface NotificationAdapter extends Adapter { execute(request:NotificationRequest):Promise<NotificationResponse>; }
