/**
 * File: packages/notifications/src/service.ts
 * Purpose: Dispatches vendor-neutral notification requests through registered adapters with deduplication and secret-safe audit evidence.
 * Author: Raushan Raj
 */
import type { AuditSink,NotificationAdapter,NotificationRequest,NotificationResponse } from '../../contracts/src';
import { AdapterRegistry } from '../../core/src/adapter-registry';
import { createId } from '../../core/src/ids';

export interface NotificationDedupeStore { get(key:string):Promise<NotificationResponse|undefined>; put(key:string,value:NotificationResponse,ttlSeconds:number):Promise<void>; }
export class InMemoryNotificationDedupeStore implements NotificationDedupeStore {
  private readonly values=new Map<string,{value:NotificationResponse;expiresAt:number}>();
  async get(key:string){const found=this.values.get(key);if(!found)return undefined;if(found.expiresAt<=Date.now()){this.values.delete(key);return undefined;}return structuredClone(found.value);}
  async put(key:string,value:NotificationResponse,ttlSeconds:number){this.values.set(key,{value:structuredClone(value),expiresAt:Date.now()+ttlSeconds*1000});}
}
export class NotificationService {
  constructor(private readonly registry:AdapterRegistry,private readonly audit?:AuditSink,private readonly dedupe:NotificationDedupeStore=new InMemoryNotificationDedupeStore(),private readonly dedupeTtlSeconds=3600){}
  async send(adapterId:string,request:NotificationRequest):Promise<NotificationResponse>{
    if(!request.title.trim()||request.title.length>256)throw new Error('Notification title must contain 1-256 characters');if(!request.message.trim()||request.message.length>10_000)throw new Error('Notification message must contain 1-10000 characters');if((request.links?.length??0)>20)throw new Error('Notification links are limited to 20 entries');
    const adapter=this.registry.get<NotificationAdapter>(adapterId);if(adapter.descriptor.kind!=='notification')throw new Error(`Adapter is not a notification adapter: ${adapterId}`);
    const key=request.dedupeKey?`${adapterId}:${request.scope.organizationId}:${request.dedupeKey}`:undefined;if(key){const prior=await this.dedupe.get(key);if(prior)return prior;}
    try{const result=await adapter.execute(request);if(key&&result.ok)await this.dedupe.put(key,result,this.dedupeTtlSeconds);await this.record(adapterId,request,result.ok?'succeeded':'failed',result);return result;}catch(error){await this.record(adapterId,request,'failed');throw error;}
  }
  list():NotificationAdapter[]{return this.registry.list('notification') as NotificationAdapter[];}
  private async record(adapterId:string,request:NotificationRequest,outcome:'succeeded'|'failed',result?:NotificationResponse){if(!this.audit)return;await this.audit.append({id:createId('audit'),timestamp:new Date().toISOString(),actorId:'system',action:'notification.send',resource:`adapter:${adapterId}`,outcome,correlationId:request.correlationId,scope:request.scope,metadata:{adapterId,severity:request.severity,notificationId:request.id,requestId:result?.requestId,externalId:result?.externalId}});}
}
