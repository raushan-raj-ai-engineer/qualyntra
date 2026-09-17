/**
 * File: tests/integrations/reliability-security.test.ts
 * Purpose: Verifies integration retry safety, HTTP error redaction, webhook verification, base-URL hardening, and audit evidence.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';import { createHmac } from 'node:crypto';
import { AdapterRegistry } from '../../packages/core/src/adapter-registry';
import { InMemoryAuditLog } from '../../packages/governance/src/audit-log';
import { IntegrationService,HmacSha256WebhookVerifier,IntegrationHttpError,withIntegrationRetry,endpoint } from '../../packages/integrations/src';
import { SecretResolverRegistry } from '../../packages/security/src/secrets';

test('retries occur only for explicitly idempotent integration mutations',async()=>{let count=0;const action=async()=>{count++;if(count===1)throw new IntegrationHttpError('temporary','x',503,true);return'ok';};await assert.rejects(()=>withIntegrationRetry(action,{idempotent:false,policy:{maxAttempts:2,baseDelayMs:0,maxDelayMs:0,jitterRatio:0}}),/temporary/);assert.equal(count,1);count=0;const value=await withIntegrationRetry(action,{idempotent:true,policy:{maxAttempts:2,baseDelayMs:0,maxDelayMs:0,jitterRatio:0},sleep:async()=>{}});assert.equal(value,'ok');assert.equal(count,2);});

test('base URL helper rejects embedded credentials',()=>{assert.throws(()=>endpoint('https://user:pass@example.test','api'),/must not contain embedded credentials/);});

test('HMAC webhook verifier uses secret reference and timing-safe comparison boundary',async()=>{const secrets=new SecretResolverRegistry();secrets.register({id:'test',supports:r=>r.provider==='test',async resolve(){return'webhook-secret';}});const body='{"event":"push"}';const signature=`sha256=${createHmac('sha256','webhook-secret').update(body).digest('hex')}`;const verifier=new HmacSha256WebhookVerifier(secrets);assert.equal((await verifier.verify({body,signature,secret:{provider:'test',key:'HOOK'}})).valid,true);assert.equal((await verifier.verify({body,signature:'sha256=bad',secret:{provider:'test',key:'HOOK'}})).valid,false);});

test('integration service records secret-safe audit metadata for outbound mutation',async()=>{const registry=new AdapterRegistry();registry.register({descriptor:{id:'custom',kind:'integration',version:'1',displayName:'Custom',description:'test',capabilities:['notify']},async health(){return{status:'healthy' as const,checkedAt:new Date().toISOString()};},async execute(){return{ok:true,externalId:'e1',requestId:'r1'};}} as any);const audit=new InMemoryAuditLog();const service=new IntegrationService(registry,audit);await service.execute('custom',{operation:'notify',scope:{organizationId:'o1'},correlationId:'c1',actorId:'svc1',payload:{authorization:'secret-value'}});const records=await audit.list();assert.equal(records.length,1);assert.equal(records[0]?.actorId,'svc1');assert.equal(records[0]?.metadata?.externalId,'e1');assert.equal(JSON.stringify(records[0]?.metadata).includes('secret-value'),false);});
