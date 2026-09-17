/**
 * File: packages/integrations/src/service.ts
 * Purpose: Executes registered enterprise integration adapters through the central adapter registry with kind validation.
 * Author: Raushan Raj
 */
import type { IntegrationAdapter,IntegrationRequest,IntegrationResponse } from '../../contracts/src/integration';
import { AdapterRegistry } from '../../core/src/adapter-registry';

export class IntegrationService{
  constructor(private readonly registry:AdapterRegistry){}
  async execute(adapterId:string,request:IntegrationRequest):Promise<IntegrationResponse>{
    const adapter=this.registry.get<IntegrationAdapter>(adapterId);
    if(adapter.descriptor.kind!=='integration')throw new Error(`Adapter is not an integration: ${adapterId}`);
    return adapter.execute(request);
  }
  list():IntegrationAdapter[]{return this.registry.list('integration') as IntegrationAdapter[];}
}
