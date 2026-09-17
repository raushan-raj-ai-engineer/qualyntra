/**
 * File: packages/evaluation/src/provider-registry.ts
 * Purpose: Registers multiple model providers and implements ordered failover without coupling metrics to a vendor.
 * Author: Raushan Raj
 */
import type { ModelProviderAdapter,ModelRequest,ModelResponse } from '../../contracts/src/evaluation';
export class ModelProviderRegistry { private readonly providers=new Map<string,ModelProviderAdapter>(); register(provider:ModelProviderAdapter):void{if(this.providers.has(provider.id))throw new Error(`Provider already registered: ${provider.id}`);this.providers.set(provider.id,provider);} get(id:string):ModelProviderAdapter{const p=this.providers.get(id);if(!p)throw new Error(`Provider not registered: ${id}`);return p;} list():ModelProviderAdapter[]{return [...this.providers.values()];} async generateWithFailover(order:string[],request:ModelRequest):Promise<ModelResponse>{const errors:string[]=[];for(const id of order){try{const p=this.get(id);const h=await p.health();if(h.status==='unavailable'){errors.push(`${id}: ${h.message??'unavailable'}`);continue;}return await p.generate(request);}catch(e){errors.push(`${id}: ${e instanceof Error?e.message:String(e)}`);}}throw new Error(`All model providers failed: ${errors.join(' | ')}`);} }

