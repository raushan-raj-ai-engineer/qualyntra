/**
 * File: adapters/llm/mock/src/index.ts
 * Purpose: Provides a deterministic offline model provider for tests, demos, and CI without network access.
 * Author: Raushan Raj
 */
import type { ModelProviderAdapter,ModelProviderCapabilities,ModelRequest,ModelResponse } from '../../../../packages/contracts/src/evaluation';
export class MockModelProvider implements ModelProviderAdapter { readonly id='mock'; constructor(private readonly responder:(r:ModelRequest)=>string=()=>'{"score":1,"reason":"mock evaluation"}'){} capabilities():ModelProviderCapabilities{return {chat:true,streaming:false,embeddings:false,jsonMode:true,tools:false,multimodal:false};} async health(){return {status:'healthy' as const,message:'Offline deterministic provider.'};} async generate(request:ModelRequest):Promise<ModelResponse>{const start=Date.now();return {content:this.responder(request),model:'mock-1',provider:this.id,latencyMs:Date.now()-start,inputTokens:0,outputTokens:0,costUsd:0};} }

