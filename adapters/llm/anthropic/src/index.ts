/**
 * File: adapters/llm/anthropic/src/index.ts
 * Purpose: Implements Anthropic Messages API text generation with explicit API versioning, network policy, and injectable transport.
 * Author: Raushan Raj
 */
import type { ModelProviderAdapter, ModelProviderCapabilities, ModelRequest, ModelResponse } from '../../../../packages/contracts/src/evaluation';
import type { NetworkPolicy } from '../../../../packages/contracts/src/configuration';
import { assertNetworkAllowed } from '../../../../packages/security/src/network-policy';
import { asRecord, FetchProviderHttpTransport, type ProviderHttpTransport } from '../../../../packages/providers/src/http';
import { capabilitiesWith, configuredHealth, endpoint, header, TEXT_CHAT_CAPABILITIES } from '../../../../packages/providers/src/adapter-utils';

export interface AnthropicOptions { id?:string;baseUrl:string;apiKey:string;model:string;apiVersion:string;defaultMaxTokens:number;networkPolicy:NetworkPolicy;headers?:Record<string,string>;timeoutMs?:number;transport?:ProviderHttpTransport;capabilities?:Partial<ModelProviderCapabilities>; }
export class AnthropicProvider implements ModelProviderAdapter {
  readonly id:string; private readonly transport:ProviderHttpTransport;
  constructor(private readonly options:AnthropicOptions){this.id=options.id??'anthropic';this.transport=options.transport??new FetchProviderHttpTransport();}
  capabilities(){return capabilitiesWith(TEXT_CHAT_CAPABILITIES,this.options.capabilities);}
  health(){return Promise.resolve(configuredHealth(this.options.baseUrl,this.options.networkPolicy,Boolean(this.options.apiKey)));}
  async generate(request:ModelRequest):Promise<ModelResponse>{assertNetworkAllowed(this.options.baseUrl,this.options.networkPolicy);const started=Date.now();const system=request.messages.filter(m=>m.role==='system').map(m=>m.content).join('\n');const messages=request.messages.filter(m=>m.role!=='system').map(m=>({role:m.role==='assistant'?'assistant':'user',content:m.content}));const response=await this.transport.request({providerId:this.id,url:endpoint(this.options.baseUrl,'/v1/messages'),method:'POST',timeoutMs:request.timeoutMs??this.options.timeoutMs,headers:{'content-type':'application/json','x-api-key':this.options.apiKey,'anthropic-version':this.options.apiVersion,...this.options.headers},body:JSON.stringify({model:request.model??this.options.model,max_tokens:request.maxTokens??this.options.defaultMaxTokens,messages,...(system?{system}:{}),...(request.temperature===undefined?{}:{temperature:request.temperature})})});const body=asRecord(response.body);const usage=asRecord(body.usage);const inputTokens=num(usage.input_tokens);const outputTokens=num(usage.output_tokens);const text=(Array.isArray(body.content)?body.content:[]).map(item=>asRecord(item)).filter(item=>item.type==='text'&&typeof item.text==='string').map(item=>item.text).join('');return {content:text,model:String(body.model??request.model??this.options.model),provider:this.id,latencyMs:Date.now()-started,inputTokens,outputTokens,totalTokens:(inputTokens??0)+(outputTokens??0),requestId:header(response.headers,'request-id','x-request-id'),raw:body};}
}
function num(value:unknown):number|undefined{return typeof value==='number'&&Number.isFinite(value)?value:undefined;}
