/**
 * File: adapters/notifications/slack/src/index.ts
 * Purpose: Sends operational alerts to Slack through a secret-referenced incoming-webhook URL without Slack SDK coupling.
 * Author: Raushan Raj
 */
import type { AdapterHealth,NetworkPolicy,NotificationAdapter,NotificationRequest,NotificationResponse,SecretReference } from '../../../../packages/contracts/src';
import type { SecretResolverRegistry } from '../../../../packages/security/src/secrets';
import { FetchNotificationHttpTransport,type NotificationHttpTransport } from '../../../../packages/notifications/src/http';
import { withNotificationRetry,type NotificationRetryPolicy } from '../../../../packages/notifications/src/retry';
import { plainNotificationText,resolveWebhookUrl } from '../../../../packages/notifications/src/utils';
export interface SlackNotificationOptions { id?:string; webhook:SecretReference; secrets:SecretResolverRegistry; networkPolicy:NetworkPolicy; transport?:NotificationHttpTransport; timeoutMs?:number; retryPolicy?:NotificationRetryPolicy; }
export class SlackNotificationAdapter implements NotificationAdapter {
  readonly descriptor;private readonly transport:NotificationHttpTransport;
  constructor(private readonly options:SlackNotificationOptions){this.descriptor={id:options.id??'slack-notification',kind:'notification' as const,version:'1.0.0',displayName:'Slack',description:'Slack incoming-webhook notification adapter',capabilities:['notify'],supportedTools:['slack']};this.transport=options.transport??new FetchNotificationHttpTransport();}
  async health():Promise<AdapterHealth>{return{status:'healthy',message:'configured; no webhook request performed',checkedAt:new Date().toISOString()};}
  async execute(request:NotificationRequest):Promise<NotificationResponse>{const url=await resolveWebhookUrl(this.options.secrets,this.options.webhook,this.options.networkPolicy);return withNotificationRetry(async()=>{const response=await this.transport.post({adapterId:this.descriptor.id,url,headers:{'content-type':'application/json'},body:JSON.stringify({text:plainNotificationText(request)}),timeoutMs:this.options.timeoutMs??5000,maxResponseBytes:65536});return{ok:true,requestId:response.headers['x-request-id'],metadata:{status:response.status}};},Boolean(request.dedupeKey),this.options.retryPolicy);}
}
