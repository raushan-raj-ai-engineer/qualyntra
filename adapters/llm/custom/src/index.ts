/**
 * File: adapters/llm/custom/src/index.ts
 * Purpose: Defines a simple wrapper for enterprise custom model providers implemented without modifying Qualyntra core.
 * Author: Raushan Raj
 */
import type { ModelProviderAdapter,ModelProviderCapabilities,ModelRequest,ModelResponse } from '../../../../packages/contracts/src/evaluation';
export interface CustomProviderHooks { generate(request:ModelRequest):Promise<ModelResponse>; health?():Promise<{status:'healthy'|'degraded'|'unavailable';message?:string}>; capabilities?():ModelProviderCapabilities; }
export class CustomModelProvider implements ModelProviderAdapter { constructor(public readonly id:string,private readonly hooks:CustomProviderHooks){} capabilities():ModelProviderCapabilities{return this.hooks.capabilities?.()??{chat:true,streaming:false,embeddings:false,jsonMode:false,tools:false,multimodal:false};} async health(){return this.hooks.health?.()??{status:'healthy' as const,message:'Custom provider registered.'};} generate(request:ModelRequest){return this.hooks.generate(request);} }

