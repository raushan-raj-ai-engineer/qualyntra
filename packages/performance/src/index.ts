/**
 * File: packages/performance/src/index.ts
 * Purpose: Defines vendor-neutral performance summaries and deterministic SLO gate evaluation for Qualyntra certification and future runtime reporting.
 * Author: Raushan Raj
 */
export interface PerformanceSummary{
  samples:number;
  successes:number;
  errors:number;
  errorRate:number;
  durationMs:number;
  throughputPerSecond:number;
  p50Ms:number;
  p95Ms:number;
  p99Ms:number;
  maxMs:number;
}
export interface PerformanceThreshold{
  maxErrorRate?:number;
  maxP95Ms?:number;
  maxP99Ms?:number;
  minThroughputPerSecond?:number;
}
export interface PerformanceGateResult{
  status:'pass'|'fail';
  violations:string[];
}
function finite(value:number,label:string):void{if(!Number.isFinite(value)||value<0)throw new Error(`${label} must be a finite non-negative number.`);}
export function percentile(values:number[],quantile:number):number{
  if(!Number.isFinite(quantile)||quantile<0||quantile>1)throw new Error('quantile must be between zero and one.');
  if(values.length===0)return 0;
  const sorted=[...values];for(const value of sorted)finite(value,'duration');sorted.sort((a,b)=>a-b);
  const index=Math.min(sorted.length-1,Math.max(0,Math.ceil(quantile*sorted.length)-1));return sorted[index]??0;
}
export function summarizePerformance(input:{durationsMs:number[];errors:number;durationMs:number}):PerformanceSummary{
  if(!Number.isInteger(input.errors)||input.errors<0)throw new Error('errors must be a non-negative integer.');finite(input.durationMs,'durationMs');
  const samples=input.durationsMs.length+input.errors;const successes=input.durationsMs.length;const throughputPerSecond=input.durationMs>0?successes/(input.durationMs/1000):successes;
  return{samples,successes,errors:input.errors,errorRate:samples?input.errors/samples:0,durationMs:input.durationMs,throughputPerSecond,p50Ms:percentile(input.durationsMs,0.50),p95Ms:percentile(input.durationsMs,0.95),p99Ms:percentile(input.durationsMs,0.99),maxMs:input.durationsMs.length?Math.max(...input.durationsMs):0};
}
export function evaluatePerformance(summary:PerformanceSummary,threshold:PerformanceThreshold):PerformanceGateResult{
  const violations:string[]=[];
  if(threshold.maxErrorRate!==undefined&&summary.errorRate>threshold.maxErrorRate)violations.push(`errorRate ${summary.errorRate} exceeds ${threshold.maxErrorRate}`);
  if(threshold.maxP95Ms!==undefined&&summary.p95Ms>threshold.maxP95Ms)violations.push(`p95Ms ${summary.p95Ms} exceeds ${threshold.maxP95Ms}`);
  if(threshold.maxP99Ms!==undefined&&summary.p99Ms>threshold.maxP99Ms)violations.push(`p99Ms ${summary.p99Ms} exceeds ${threshold.maxP99Ms}`);
  if(threshold.minThroughputPerSecond!==undefined&&summary.throughputPerSecond<threshold.minThroughputPerSecond)violations.push(`throughputPerSecond ${summary.throughputPerSecond} is below ${threshold.minThroughputPerSecond}`);
  return{status:violations.length?'fail':'pass',violations};
}
