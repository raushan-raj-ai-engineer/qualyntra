/**
 * File: tests/agent/config-identity.test.ts
 * Purpose: Verifies execution-agent configuration security rules and stable generated worker identity persistence.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';import { promises as fs } from 'node:fs';import path from 'node:path';import { tmpdir } from 'node:os';import { FileAgentIdentityStore,loadExecutionAgentConfiguration } from '../../packages/agent/src';
test('agent configuration requires tenant and one credential source',()=>{assert.throws(()=>loadExecutionAgentConfiguration({QUALYNTRA_AGENT_TOKEN:'x'}),/ORGANIZATION/);assert.throws(()=>loadExecutionAgentConfiguration({QUALYNTRA_AGENT_ORGANIZATION_ID:'o1'}),/TOKEN_FILE or QUALYNTRA_AGENT_TOKEN/);assert.throws(()=>loadExecutionAgentConfiguration({QUALYNTRA_AGENT_ORGANIZATION_ID:'o1',QUALYNTRA_AGENT_TOKEN:'x',QUALYNTRA_AGENT_TOKEN_FILE:'/x'}),/only one/);});
test('agent configuration rejects insecure remote control planes and invalid heartbeat timing',()=>{assert.throws(()=>loadExecutionAgentConfiguration({QUALYNTRA_AGENT_ORGANIZATION_ID:'o1',QUALYNTRA_AGENT_TOKEN:'x',QUALYNTRA_AGENT_CONTROL_PLANE_ORIGIN:'http://example.test'}),/HTTPS/);assert.throws(()=>loadExecutionAgentConfiguration({QUALYNTRA_AGENT_ORGANIZATION_ID:'o1',QUALYNTRA_AGENT_TOKEN:'x',QUALYNTRA_AGENT_LEASE_MS:'5000',QUALYNTRA_AGENT_HEARTBEAT_MS:'5000'}),/less than/);});
test('agent configuration parses scope, runners, labels, and safe localhost development',()=>{const config=loadExecutionAgentConfiguration({QUALYNTRA_AGENT_ORGANIZATION_ID:'o1',QUALYNTRA_AGENT_WORKSPACE_ID:'w1',QUALYNTRA_AGENT_PROJECT_ID:'p1',QUALYNTRA_AGENT_TOKEN:'x',QUALYNTRA_AGENT_RUNNERS:'pytest,playwright-test',QUALYNTRA_AGENT_LABELS:'linux,chrome'});assert.equal(config.controlPlaneOrigin,'http://127.0.0.1:4317');assert.equal(config.scope.projectId,'p1');assert.deepEqual(config.runnerIds,['pytest','playwright-test']);assert.deepEqual(config.labels,['linux','chrome']);});
test('file identity store creates and reuses a stable private worker id',async()=>{const dir=await fs.mkdtemp(path.join(tmpdir(),'qualyntra-agent-id-'));try{const store=new FileAgentIdentityStore(dir);const first=await store.loadOrCreate();const second=await store.loadOrCreate();assert.match(first,/^worker_/);assert.equal(second,first);}finally{await fs.rm(dir,{recursive:true,force:true});}});

test('agent permits explicitly opted-in internal HTTP control-plane origins',()=>{
  const config=loadExecutionAgentConfiguration({
    QUALYNTRA_AGENT_ORGANIZATION_ID:'org-a',
    QUALYNTRA_AGENT_TOKEN:'test-token',
    QUALYNTRA_AGENT_CONTROL_PLANE_ORIGIN:'http://control-plane:4317',
    QUALYNTRA_AGENT_ALLOW_INSECURE_CONTROL_PLANE:'true'
  });

  assert.equal(config.controlPlaneOrigin,'http://control-plane:4317');
});
