/**
 * File: packages/evaluation/src/llm-judge.ts
 * Purpose: Implements a configurable LLM-as-a-judge metric using a provider supplied at runtime rather than a fixed model.
 * Author: Raushan Raj
 */
import type { EvaluationMetric,EvaluationCase,EvaluationContext,MetricResult } from '../../contracts/src/evaluation';
export class LlmJudgeMetric implements EvaluationMetric { readonly type='llm-judge' as const; constructor(public readonly id:string,public readonly name:string,public readonly threshold:number,private readonly rubric:string){} async evaluate(c:EvaluationCase,ctx:EvaluationContext):Promise<MetricResult>{if(!ctx.judge)throw new Error(`Metric ${this.id} requires an evaluation judge provider.`);const response=await ctx.judge.generate({temperature:0,messages:[{role:'system',content:'You are a strict software quality evaluator. Return ONLY JSON with keys score (0..1) and reason.'},{role:'user',content:`Rubric:\n${this.rubric}\n\nInput:\n${c.input}\n\nActual output:\n${c.actualOutput}\n\nExpected output:\n${c.expectedOutput??'(not supplied)'}\n\nContext:\n${(c.context??[]).join('\n')}`} ]});let parsed:{score:number;reason:string};try{parsed=JSON.parse(response.content);}catch{throw new Error(`Judge ${ctx.judge.id} returned non-JSON evaluation output.`);}const score=Math.max(0,Math.min(1,Number(parsed.score)));return {metricId:this.id,score,passed:score>=this.threshold,reason:String(parsed.reason??'No reason supplied'),details:{judgeProvider:ctx.judge.id,judgeModel:response.model,latencyMs:response.latencyMs,costUsd:response.costUsd}};} }

