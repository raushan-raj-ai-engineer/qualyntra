/**
 * File: tests/java-automation/java-bridge.test.ts
 * Purpose: Verifies the Node-to-Java automation adapter health and normalized execution contract without requiring live Playwright or Selenium Java libraries.
 * Author: Raushan Raj
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { JavaAutomationBridgeAdapter,type JavaBridgeInvoker } from '../../adapters/automation/java-bridge/src';
import type { AutomationPlan } from '../../packages/contracts/src/automation';

const plan:AutomationPlan={runId:'java-run-1',engine:'selenium',browser:'chrome',commands:[{id:'nav',type:'navigate',url:'http://localhost'}]};

test('java automation bridge reports degraded when vendor engines are absent',async()=>{
  const invoke:JavaBridgeInvoker=async()=>({ok:true,data:{engines:{playwright:{available:false},selenium:{available:false}}}});
  const adapter=new JavaAutomationBridgeAdapter({},invoke);assert.equal((await adapter.health()).status,'degraded');
});

test('java automation bridge reports healthy when at least one vendor engine exists',async()=>{
  const invoke:JavaBridgeInvoker=async()=>({ok:true,data:{engines:{playwright:{available:false},selenium:{available:true}}}});
  const adapter=new JavaAutomationBridgeAdapter({},invoke);assert.equal((await adapter.health()).status,'healthy');
});

test('java automation bridge returns canonical execution outcome',async()=>{
  let operation='';
  const invoke:JavaBridgeInvoker=async(payload)=>{operation=String(payload.operation);return {ok:true,data:{result:{runId:'java-run-1',engine:'selenium',status:'passed',startedAt:'2026-01-01T00:00:00Z',finishedAt:'2026-01-01T00:00:01Z',steps:[],evidence:[]}}};};
  const result=await new JavaAutomationBridgeAdapter({},invoke).execute(plan);
  assert.equal(operation,'automation.execute');assert.equal(result.engine,'selenium');assert.equal(result.status,'passed');
});

test('java automation bridge rejects malformed execution response',async()=>{
  const invoke:JavaBridgeInvoker=async()=>({ok:true,data:{}});
  await assert.rejects(()=>new JavaAutomationBridgeAdapter({},invoke).execute(plan),/did not include a result/);
});
