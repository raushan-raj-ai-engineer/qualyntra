/**
 * File: packages/contracts/src/evaluation.ts
 * Purpose: Defines model-provider, dataset, metric, evaluation, judge, and regression-gate contracts.
 * Author: Raushan Raj
 */
export interface ModelMessage { role:'system'|'user'|'assistant'|'tool'; content:string; name?:string; }
export interface ModelRequest { messages:ModelMessage[]; model?:string; temperature?:number; maxTokens?:number; metadata?:Record<string,unknown>; }
export interface ModelResponse { content:string; model:string; provider:string; latencyMs:number; inputTokens?:number; outputTokens?:number; costUsd?:number; raw?:unknown; }
export interface ModelProviderCapabilities { chat:boolean; streaming:boolean; embeddings:boolean; jsonMode:boolean; tools:boolean; multimodal:boolean; }
export interface ModelProviderAdapter { readonly id:string; capabilities():ModelProviderCapabilities; generate(request:ModelRequest):Promise<ModelResponse>; health():Promise<{status:'healthy'|'degraded'|'unavailable';message?:string}>; }
export type MetricType='deterministic'|'llm-judge'|'custom';
export interface EvaluationCase { id:string; input:string; actualOutput:string; expectedOutput?:string; context?:string[]; retrievalContext?:string[]; toolsExpected?:string[]; toolsUsed?:string[]; metadata?:Record<string,unknown>; }
export interface EvaluationMetric { id:string; name:string; type:MetricType; threshold:number; evaluate(testCase:EvaluationCase, context:EvaluationContext):Promise<MetricResult>; }
export interface MetricResult { metricId:string; score:number; passed:boolean; reason:string; details?:Record<string,unknown>; }
export interface EvaluationContext { judge?:ModelProviderAdapter; variables?:Record<string,unknown>; }
export interface EvaluationRunResult { caseId:string; passed:boolean; metrics:MetricResult[]; createdAt:string; }
export interface RegressionGate { id:string; minPassRate:number; requiredMetrics?:Record<string,number>; maxAverageCostUsd?:number; maxP95LatencyMs?:number; }

