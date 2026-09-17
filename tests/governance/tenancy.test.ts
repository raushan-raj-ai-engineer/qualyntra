/**
 * File: tests/governance/tenancy.test.ts
 * Purpose: Verifies hierarchical tenant containment and invalid-scope rejection.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { scopeContains,validateScope } from '../../packages/governance/src';
test('organization scope contains nested workspace project and environment',()=>{assert.equal(scopeContains({organizationId:'o1'},{organizationId:'o1',workspaceId:'w1',projectId:'p1',environmentId:'qa'}),true);});
test('tenant containment does not cross organizations or scoped descendants',()=>{assert.equal(scopeContains({organizationId:'o1',workspaceId:'w1'},{organizationId:'o1',workspaceId:'w2'}),false);assert.equal(scopeContains({organizationId:'o1'},{organizationId:'o2'}),false);});
test('invalid nested scopes fail closed',()=>{assert.throws(()=>validateScope({organizationId:'o1',projectId:'p1'}),/requires workspaceId/);});
