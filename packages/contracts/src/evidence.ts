/**
 * File: packages/contracts/src/evidence.ts
 * Purpose: Defines normalized evidence records for screenshots, traces, logs, DOM, network, and AI artifacts.
 * Author: Raushan Raj
 */
export type EvidenceKind='screenshot'|'trace'|'video'|'log'|'dom'|'network'|'request'|'response'|'prompt'|'model-response'|'metric'|'custom';
export interface EvidenceRecord { id:string; runId:string; kind:EvidenceKind; name:string; contentType:string; createdAt:string; path?:string; uri?:string; sha256?:string; redacted:boolean; metadata?:Record<string,unknown>; }
export interface EvidenceAdapter { readonly id:string; collect(context:{runId:string;kind:EvidenceKind;source:unknown}):Promise<EvidenceRecord[]>; }

