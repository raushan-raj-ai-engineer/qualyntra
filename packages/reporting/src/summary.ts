/**
 * File: packages/reporting/src/summary.ts
 * Purpose: Aggregates normalized execution and LLM evaluation outcomes into product-level quality summaries.
 * Author: Raushan Raj
 */
import type { UniversalTestResult } from '../../contracts/src/result'; import type { EvaluationRunResult } from '../../contracts/src/evaluation';
export interface QualitySummary { tests:{total:number;passed:number;failed:number;skipped:number;passRate:number}; evaluations:{total:number;passed:number;failed:number;passRate:number}; }
export function summarizeQuality(tests:UniversalTestResult[],evaluations:EvaluationRunResult[]):QualitySummary{const tp=tests.filter(t=>t.status==='passed').length,tf=tests.filter(t=>t.status==='failed'||t.status==='error').length,ts=tests.filter(t=>t.status==='skipped').length,ep=evaluations.filter(e=>e.passed).length;return {tests:{total:tests.length,passed:tp,failed:tf,skipped:ts,passRate:tests.length?tp/tests.length:0},evaluations:{total:evaluations.length,passed:ep,failed:evaluations.length-ep,passRate:evaluations.length?ep/evaluations.length:0}};}

