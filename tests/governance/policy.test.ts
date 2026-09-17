/**
 * File: tests/governance/policy.test.ts
 * Purpose: Verifies transparent release-policy decisions, evidence requirements, approvals, and expiring exceptions.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { evaluateReleasePolicy } from '../../packages/governance/src';
const scope={organizationId:'o1',workspaceId:'w1',projectId:'p1',environmentId:'prod'};
const policy={id:'prod',name:'Production',requiredApprovals:1,rules:[{id:'critical',description:'No critical failures',fact:'criticalFailures',operator:'eq' as const,expected:0,severity:'block' as const},{id:'quality',description:'LLM quality minimum',fact:'llmQuality',operator:'gte' as const,expected:0.9,severity:'review' as const}]};
test('release policy passes only when evidence and approvals satisfy policy',()=>{const d=evaluateReleasePolicy({policy,scope,facts:[{key:'criticalFailures',value:0,evidenceRefs:['r1']},{key:'llmQuality',value:0.95,evidenceRefs:['e1']}],approvals:[{actorId:'a1',timestamp:new Date().toISOString(),scope}]});assert.equal(d.status,'PASS');assert.equal(d.rules[0]?.evidenceRefs[0],'r1');});
test('missing blocking evidence fails closed',()=>{const d=evaluateReleasePolicy({policy,scope,facts:[{key:'llmQuality',value:0.95}],approvals:[{actorId:'a1',timestamp:new Date().toISOString(),scope}]});assert.equal(d.status,'FAIL');assert.match(d.rules[0]!.reason,/missing/i);});
test('review rules and missing approvals produce review required',()=>{const d=evaluateReleasePolicy({policy,scope,facts:[{key:'criticalFailures',value:0},{key:'llmQuality',value:0.5}]});assert.equal(d.status,'REVIEW_REQUIRED');assert.equal(d.approvals.present,0);});
test('active scoped exception waives only its rule and expired exception does not',()=>{const now=new Date('2026-09-17T12:00:00Z');const active=evaluateReleasePolicy({policy:{...policy,requiredApprovals:0},scope,facts:[{key:'criticalFailures',value:3},{key:'llmQuality',value:0.95}],exceptions:[{ruleId:'critical',reason:'approved incident',approvedBy:'owner',scope,expiresAt:'2026-09-18T00:00:00Z'}],now});assert.equal(active.status,'PASS');const expired=evaluateReleasePolicy({policy:{...policy,requiredApprovals:0},scope,facts:[{key:'criticalFailures',value:3},{key:'llmQuality',value:0.95}],exceptions:[{ruleId:'critical',reason:'old',approvedBy:'owner',scope,expiresAt:'2026-09-16T00:00:00Z'}],now});assert.equal(expired.status,'FAIL');});
