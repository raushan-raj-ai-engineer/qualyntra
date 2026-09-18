/**
 * File: tests/performance/performance-statistics.test.ts
 * Purpose: Verifies deterministic percentile, summary, and SLO gate behavior used by performance and scale certification.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';import { evaluatePerformance,percentile,summarizePerformance } from '../../packages/performance/src';
test('percentile uses nearest-rank ordering without mutating the source sample',()=>{const samples=[40,10,30,20];assert.equal(percentile(samples,0.50),20);assert.equal(percentile(samples,0.95),40);assert.deepEqual(samples,[40,10,30,20]);});
test('performance summary reports latency throughput and error rate deterministically',()=>{const summary=summarizePerformance({durationsMs:[10,20,30,40],errors:1,durationMs:1000});assert.deepEqual({samples:summary.samples,successes:summary.successes,errors:summary.errors,errorRate:summary.errorRate,throughput:summary.throughputPerSecond,p95:summary.p95Ms},{samples:5,successes:4,errors:1,errorRate:0.2,throughput:4,p95:40});});
test('performance gate passes only when every configured SLO is satisfied',()=>{const summary=summarizePerformance({durationsMs:[10,20,30],errors:0,durationMs:300});assert.equal(evaluatePerformance(summary,{maxErrorRate:0,maxP95Ms:50,maxP99Ms:50,minThroughputPerSecond:5}).status,'pass');const failed=evaluatePerformance(summary,{maxP95Ms:20,minThroughputPerSecond:20});assert.equal(failed.status,'fail');assert.equal(failed.violations.length,2);});
test('performance statistics reject invalid durations and quantiles',()=>{assert.throws(()=>percentile([1,-1],0.5),/non-negative/);assert.throws(()=>percentile([1],1.1),/between zero and one/);assert.throws(()=>summarizePerformance({durationsMs:[],errors:-1,durationMs:1}),/errors/);});
