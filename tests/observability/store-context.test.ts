/**
 * File: tests/observability/store-context.test.ts
 * Purpose: Verifies telemetry context propagation, tenant filtering, redaction, bounds, and validation.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { TelemetryContextManager,InMemoryTelemetryStore } from '../../packages/observability/src';
const resource={serviceName:'control-plane'};

test('telemetry context propagates across async work',async()=>{const manager=new TelemetryContextManager();await manager.run({correlationId:'corr-1',traceId:'trace-1',scope:{organizationId:'o1'}},async()=>{await Promise.resolve();assert.equal(manager.current().correlationId,'corr-1');assert.equal(manager.current().traceId,'trace-1');});assert.deepEqual(manager.current(),{});});
test('telemetry store redacts sensitive nested attributes',async()=>{const store=new InMemoryTelemetryStore();await store.emitLog({id:'l1',timestamp:new Date().toISOString(),severity:'info',message:'safe',resource,attributes:{token:'secret',nested:{password:'secret2',value:'ok'}}});const data=await store.query();assert.equal(data.logs[0]?.attributes?.token,'[REDACTED]');assert.deepEqual(data.logs[0]?.attributes?.nested,{password:'[REDACTED]',value:'ok'});});
test('telemetry query enforces tenant hierarchy',async()=>{const store=new InMemoryTelemetryStore();for(const org of ['o1','o2'])await store.recordMetric({id:`m-${org}`,timestamp:new Date().toISOString(),name:'jobs',kind:'gauge',value:1,resource,scope:{organizationId:org}});const data=await store.query({scope:{organizationId:'o1'}});assert.deepEqual(data.metrics.map(v=>v.scope?.organizationId),['o1']);});
test('telemetry store remains bounded per signal',async()=>{const store=new InMemoryTelemetryStore({maxRecordsPerSignal:2});for(let i=1;i<=3;i++)await store.recordHealth({id:`h${i}`,timestamp:new Date().toISOString(),component:'queue',status:'healthy'});const data=await store.query();assert.deepEqual(data.health.map(v=>v.id),['h2','h3']);});
test('telemetry store rejects non-finite metrics and invalid span ranges',async()=>{const store=new InMemoryTelemetryStore();await assert.rejects(()=>store.recordMetric({id:'m',timestamp:new Date().toISOString(),name:'bad',kind:'gauge',value:Number.NaN,resource}),/finite/);await assert.rejects(()=>store.recordSpan({id:'s',traceId:'t',spanId:'sp',name:'bad',startTime:'2026-01-02T00:00:00.000Z',endTime:'2026-01-01T00:00:00.000Z',status:'error',resource}),/endTime/);});
