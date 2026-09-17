/**
 * File: tests/integrations/integration-service.test.ts
 * Purpose: Verifies enterprise integrations reuse the central adapter registry and reject non-integration adapters.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { AdapterRegistry } from '../../packages/core/src/adapter-registry';
import { IntegrationService } from '../../packages/integrations/src';
const request={operation:'publish-status' as const,scope:{organizationId:'o1'},correlationId:'c1',payload:{status:'PASS'}};
test('integration service executes registered integration adapters',async()=>{const registry=new AdapterRegistry();registry.register({descriptor:{id:'custom',kind:'integration',version:'1',displayName:'Custom',description:'test',capabilities:['publish-status']},async health(){return{status:'healthy',checkedAt:new Date().toISOString()};},async execute(){return{ok:true,externalId:'x1'};}} as any);const result=await new IntegrationService(registry).execute('custom',request);assert.equal(result.ok,true);assert.equal(result.externalId,'x1');});
test('integration service rejects adapters registered under another kind',async()=>{const registry=new AdapterRegistry();registry.register({descriptor:{id:'runner',kind:'runner',version:'1',displayName:'Runner',description:'test',capabilities:[]},async health(){return{status:'healthy',checkedAt:new Date().toISOString()};}});await assert.rejects(()=>new IntegrationService(registry).execute('runner',request),/not an integration/);});
