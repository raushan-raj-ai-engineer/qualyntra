/**
 * File: tests/python-automation/python-bridge.test.ts
 * Purpose: Verifies the Node-to-Python automation adapter maps health and normalized execution payloads without requiring live Playwright or Selenium packages.
 * Author: Raushan Raj
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { PythonAutomationBridgeAdapter,type PythonBridgeInvoker } from '../../adapters/automation/python-bridge/src';
import type { AutomationPlan } from '../../packages/contracts/src/automation';

const plan:AutomationPlan={runId:'run-1',engine:'playwright',browser:'chromium',commands:[{id:'nav',type:'navigate',url:'http://localhost'}]};

test('python automation bridge reports degraded when no optional engine is installed',async()=>{
  const invoke:PythonBridgeInvoker=async()=>({ok:true,data:{engines:{playwright:{available:false},selenium:{available:false}}}});
  const adapter=new PythonAutomationBridgeAdapter({},invoke);
  const health=await adapter.health(); assert.equal(health.status,'degraded');
});

test('python automation bridge exposes healthy state when one engine exists',async()=>{
  const invoke:PythonBridgeInvoker=async()=>({ok:true,data:{engines:{playwright:{available:true},selenium:{available:false}}}});
  const adapter=new PythonAutomationBridgeAdapter({},invoke);
  const health=await adapter.health(); assert.equal(health.status,'healthy');
});

test('python automation bridge normalizes execution result from injected bridge',async()=>{
  let operation='';
  const invoke:PythonBridgeInvoker=async(payload)=>{operation=String(payload.operation);return {ok:true,data:{result:{runId:'run-1',engine:'playwright',status:'passed',startedAt:'2026-01-01T00:00:00Z',finishedAt:'2026-01-01T00:00:01Z',steps:[],evidence:[]}}};};
  const adapter=new PythonAutomationBridgeAdapter({},invoke);
  const result=await adapter.execute(plan);
  assert.equal(operation,'automation.execute'); assert.equal(result.status,'passed'); assert.equal(result.engine,'playwright');
});

test('python automation bridge rejects malformed execution response',async()=>{
  const invoke:PythonBridgeInvoker=async()=>({ok:true,data:{}});
  const adapter=new PythonAutomationBridgeAdapter({},invoke);
  await assert.rejects(()=>adapter.execute(plan),/did not include a result/);
});
