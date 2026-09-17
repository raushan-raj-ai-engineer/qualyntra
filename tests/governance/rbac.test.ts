/**
 * File: tests/governance/rbac.test.ts
 * Purpose: Verifies deny-by-default RBAC behavior and hierarchical tenant scoping.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { RbacAuthorizer,RoleCatalog } from '../../packages/governance/src';

const catalog=new RoleCatalog([{id:'runner',displayName:'Runner',permissions:['execution.run']}]);
const auth=new RbacAuthorizer(catalog);
const actor={id:'svc-1',type:'service' as const,assignments:[{roleId:'runner',scope:{organizationId:'o1',workspaceId:'w1'}}]};
test('rbac grants matching permission inside assigned tenant scope',()=>{const d=auth.authorize({actor,permission:'execution.run',resourceScope:{organizationId:'o1',workspaceId:'w1',projectId:'p1'}});assert.equal(d.allowed,true);assert.deepEqual(d.matchedRoleIds,['runner']);});
test('rbac denies cross-workspace and ungranted permissions',()=>{assert.equal(auth.authorize({actor,permission:'execution.run',resourceScope:{organizationId:'o1',workspaceId:'w2'}}).allowed,false);assert.equal(auth.authorize({actor,permission:'audit.read',resourceScope:{organizationId:'o1',workspaceId:'w1'}}).allowed,false);});
test('role catalog rejects duplicate roles',()=>{assert.throws(()=>catalog.register({id:'runner',displayName:'Duplicate',permissions:['execution.run']}),/already registered/);});
