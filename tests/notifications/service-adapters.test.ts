/**
 * File: tests/notifications/service-adapters.test.ts
 * Purpose: Verifies notification deduplication, audit safety, webhook vendor payloads, endpoint policy, and injected email transport.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { AdapterRegistry } from '../../packages/core/src/adapter-registry';
import { InMemoryAuditLog } from '../../packages/governance/src';
import { EnvironmentSecretResolver,SecretResolverRegistry } from '../../packages/security/src/secrets';
import { NotificationService } from '../../packages/notifications/src';
import { SlackNotificationAdapter } from '../../adapters/notifications/slack/src';
import { TeamsWorkflowNotificationAdapter } from '../../adapters/notifications/teams/src';
import { WebhookNotificationAdapter } from '../../adapters/notifications/webhook/src';
import { EmailNotificationAdapter } from '../../adapters/notifications/email/src';
const request={id:'n1',title:'Run failed',message:'Critical test failed',severity:'critical' as const,scope:{organizationId:'o1'},correlationId:'corr',dedupeKey:'same'};
function secrets(){const registry=new SecretResolverRegistry();registry.register(new EnvironmentSecretResolver());return registry;}
function transport(){const calls:any[]=[];return{calls,async post(input:any){calls.push(input);return{status:200,headers:{'x-request-id':'req-1'},body:'ok'};}};}

test('notification service deduplicates successful idempotent delivery and audits without message contents',async()=>{const registry=new AdapterRegistry();let calls=0;registry.register({descriptor:{id:'n',kind:'notification',version:'1',displayName:'n',description:'n',capabilities:['notify']},async health(){return{status:'healthy' as const,checkedAt:new Date().toISOString()};},async execute(){calls++;return{ok:true,externalId:'e1'};}} as any);const audit=new InMemoryAuditLog();const service=new NotificationService(registry,audit);await service.send('n',request);await service.send('n',request);assert.equal(calls,1);const records=await audit.list();assert.equal(records.length,1);assert.equal(JSON.stringify(records).includes('Critical test failed'),false);});
test('Slack and Teams adapters resolve secret webhook URLs and send normalized text payloads',async()=>{process.env.TEST_NOTIFY_URL='http://127.0.0.1:9999/hook';try{for(const Adapter of [SlackNotificationAdapter,TeamsWorkflowNotificationAdapter]){const t=transport();const adapter=new Adapter({webhook:{provider:'environment',key:'TEST_NOTIFY_URL'},secrets:secrets(),networkPolicy:{allowNetwork:true,allowedHosts:['127.0.0.1:9999']},transport:t as any});const result=await adapter.execute(request);assert.equal(result.ok,true);assert.equal(t.calls.length,1);assert.match(t.calls[0].body,/Run failed/);}}finally{delete process.env.TEST_NOTIFY_URL;}});
test('generic webhook can use a secret-referenced bearer token without persisting it in payload',async()=>{process.env.TEST_NOTIFY_URL='http://localhost:9999/hook';process.env.TEST_NOTIFY_TOKEN='super-secret-token';try{const t=transport();const adapter=new WebhookNotificationAdapter({endpoint:{provider:'environment',key:'TEST_NOTIFY_URL'},bearerToken:{provider:'environment',key:'TEST_NOTIFY_TOKEN'},secrets:secrets(),networkPolicy:{allowNetwork:true,allowedHosts:['localhost:9999']},transport:t as any});await adapter.execute(request);assert.equal(t.calls[0].headers.authorization,'Bearer super-secret-token');assert.equal(t.calls[0].body.includes('super-secret-token'),false);}finally{delete process.env.TEST_NOTIFY_URL;delete process.env.TEST_NOTIFY_TOKEN;}});
test('webhook adapter rejects insecure non-local endpoints before transport',async()=>{process.env.TEST_NOTIFY_URL='http://example.invalid/hook';try{const t=transport();const adapter=new WebhookNotificationAdapter({endpoint:{provider:'environment',key:'TEST_NOTIFY_URL'},secrets:secrets(),networkPolicy:{allowNetwork:true,allowedHosts:['example.invalid']},transport:t as any});await assert.rejects(()=>adapter.execute(request),/HTTPS/);assert.equal(t.calls.length,0);}finally{delete process.env.TEST_NOTIFY_URL;}});
test('email adapter delegates to injected transport and propagates correlation id',async()=>{let message:any;const adapter=new EmailNotificationAdapter({from:'qa@example.test',to:['team@example.test'],transport:{async send(value){message=value;return{messageId:'m1'};}}});const result=await adapter.execute(request);assert.equal(result.externalId,'m1');assert.equal(message.headers['x-correlation-id'],'corr');assert.match(message.subject,/CRITICAL/);});
