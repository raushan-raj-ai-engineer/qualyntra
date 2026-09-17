/**
 * File: packages/integrations/src/service.ts
 * Purpose: Executes registered enterprise integration adapters through the central registry and records secret-safe mutation audit evidence.
 * Author: Raushan Raj
 */
import type { AuditSink,IntegrationAdapter,IntegrationRequest,IntegrationResponse } from '../../contracts/src';
import { AdapterRegistry } from '../../core/src/adapter-registry';
import { createId } from '../../core/src/ids';

export class IntegrationService{
  constructor(private readonly registry:AdapterRegistry,private readonly audit?:AuditSink){}
  async execute(adapterId:string,request:IntegrationRequest):Promise<IntegrationResponse>{
    const adapter=this.registry.get<IntegrationAdapter>(adapterId);if(adapter.descriptor.kind!=='integration')throw new Error(`Adapter is not an integration: ${adapterId}`);
    try{const result=await adapter.execute(request);await this.record(adapterId,request,result.ok?'succeeded':'failed',result);return result;}catch(error){await this.record(adapterId,request,'failed');throw error;}
  }
  list():IntegrationAdapter[]{return this.registry.list('integration') as IntegrationAdapter[];}
  private async record(adapterId:string,request:IntegrationRequest,outcome:'succeeded'|'failed',result?:IntegrationResponse){if(!this.audit)return;await this.audit.append({id:createId('audit'),timestamp:new Date().toISOString(),actorId:request.actorId??'system',action:`integration.${request.operation}`,resource:`adapter:${adapterId}`,outcome,correlationId:request.correlationId,scope:request.scope,metadata:{adapterId,operation:request.operation,externalId:result?.externalId,requestId:result?.requestId}});}
}
