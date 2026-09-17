/**
 * File: packages/contracts/src/adapter.ts
 * Purpose: Defines common adapter metadata, health, capability, and registration contracts.
 * Author: Raushan Raj
 */
export type AdapterKind='runner'|'automation'|'result'|'evidence'|'generator'|'model-provider'|'evaluator'|'integration';
export interface AdapterDescriptor { id:string; kind:AdapterKind; version:string; displayName:string; description:string; capabilities:string[]; supportedLanguages?:string[]; supportedTools?:string[]; experimental?:boolean; }
export interface AdapterHealth { status:'healthy'|'degraded'|'unavailable'; message?:string; checkedAt:string; }
export interface Adapter { readonly descriptor:AdapterDescriptor; health():Promise<AdapterHealth>; }

