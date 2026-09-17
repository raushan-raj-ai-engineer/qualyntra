/**
 * File: adapters/llm/vllm/src/index.ts
 * Purpose: Provides a named vLLM adapter over its OpenAI-compatible HTTP surface without introducing a separate vendor SDK dependency.
 * Author: Raushan Raj
 */
import { OpenAICompatibleProvider, type OpenAICompatibleOptions } from '../../openai-compatible/src/index';
export type VllmOptions = Omit<OpenAICompatibleOptions,'id'> & { id?:string };
export class VllmProvider extends OpenAICompatibleProvider { constructor(options:VllmOptions){super({...options,id:options.id??'vllm'});} }
