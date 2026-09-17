/**
 * File: adapters/notifications/webhook/src/index.ts
 * Purpose: Delivers normalized Qualyntra notifications to a secret-referenced generic HTTPS webhook.
 * Author: Raushan Raj
 */
import type { AdapterHealth,NetworkPolicy,NotificationAdapter,NotificationRequest,NotificationResponse,SecretReference } from '../../../../packages/contracts/src';
import type { SecretResolverRegistry } from '../../../../packages/security/src/secrets';
import { FetchNotificationHttpTransport,type NotificationHttpTransport } from '../../../../packages/notifications/src/http';
import { withNotificationRetry,type NotificationRetryPolicy } from '../../../../packages/notifications/src/retry';
import { resolveWebhookUrl } from '../../../../packages/notifications/src/utils';
export interface WebhookNotificationOptions { id?:string; endpoint:SecretReference; secrets:SecretResolverRegistry; networkPolicy:NetworkPolicy; transport?:NotificationHttpTransport; timeoutMs?:number; maxResponseBytes?:number; retryPolicy?:NotificationRetryPolicy; bearerToken?:SecretReference; }
export class WebhookNotificationAdapter implements NotificationAdapter {
  readonly descriptor;private readonly transport:NotificationHttpTransport;
  constructor(private readonly options:WebhookNotificationOptions){this.descriptor={id:options.id??'webhook-notification',kind:'notification' as const,version:'1.0.0',displayName:'Webhook',description:'Generic HTTPS webhook notification adapter',capabilities:['notify'],supportedTools:['webhook']};this.transport=options.transport??new FetchNotificationHttpTransport();}
  async health():Promise<AdapterHealth>{return{status:'healthy',message:'configured; endpoint remains secret-referenced and no remote health request is performed',checkedAt:new Date().toISOString()};}
  async execute(request:NotificationRequest):Promise<NotificationResponse>{const url=await resolveWebhookUrl(this.options.secrets,this.options.endpoint,this.options.networkPolicy);const headers:Record<string,string>={'content-type':'application/json'};if(this.options.bearerToken)headers.authorization=`Bearer ${await this.options.secrets.resolve(this.options.bearerToken)}`;return withNotificationRetry(async()=>{const response=await this.transport.post({adapterId:this.descriptor.id,url,headers,body:JSON.stringify({id:request.id,title:request.title,message:request.message,severity:request.severity,correlationId:request.correlationId,scope:request.scope,attributes:request.attributes,links:request.links}),timeoutMs:this.options.timeoutMs??5000,maxResponseBytes:this.options.maxResponseBytes??65536});return{ok:true,requestId:response.headers['x-request-id'],metadata:{status:response.status}};},Boolean(request.dedupeKey),this.options.retryPolicy);}
}
