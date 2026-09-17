/**
 * File: adapters/notifications/email/src/index.ts
 * Purpose: Provides an email notification adapter over an injected mail transport so SMTP/provider credentials stay outside platform core.
 * Author: Raushan Raj
 */
import type { AdapterHealth,NotificationAdapter,NotificationRequest,NotificationResponse } from '../../../../packages/contracts/src';
import { plainNotificationText } from '../../../../packages/notifications/src/utils';
export interface EmailMessage { from:string;to:string[];subject:string;text:string;headers?:Record<string,string>; }
export interface EmailTransport { send(message:EmailMessage):Promise<{messageId?:string;requestId?:string}>; }
export interface EmailNotificationOptions { id?:string;from:string;to:string[];transport:EmailTransport; }
export class EmailNotificationAdapter implements NotificationAdapter {
  readonly descriptor;
  constructor(private readonly options:EmailNotificationOptions){if(!options.from.trim()||options.to.length===0||options.to.some(value=>!value.trim())||[options.from,...options.to].some(value=>/[\r\n]/.test(value)))throw new Error('Email notification adapter requires from and at least one recipient');this.descriptor={id:options.id??'email-notification',kind:'notification' as const,version:'1.0.0',displayName:'Email',description:'Transport-neutral email notification adapter',capabilities:['notify'],supportedTools:['email']};}
  async health():Promise<AdapterHealth>{return{status:'healthy',message:'mail transport configured; no message sent',checkedAt:new Date().toISOString()};}
  async execute(request:NotificationRequest):Promise<NotificationResponse>{const result=await this.options.transport.send({from:this.options.from,to:[...this.options.to],subject:`[${request.severity.toUpperCase()}] ${request.title}`,text:plainNotificationText(request),headers:request.correlationId&&!/[\r\n]/.test(request.correlationId)?{'x-correlation-id':request.correlationId}:undefined});return{ok:true,externalId:result.messageId,requestId:result.requestId};}
}
