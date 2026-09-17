/**
 * File: tests/governance/service.test.ts
 * Purpose: Verifies governance decisions produce auditable authorization and release records.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { GovernanceService,InMemoryAuditLog,RbacAuthorizer,RoleCatalog } from '../../packages/governance/src';
test('governance service audits authorization and release decisions',async()=>{const audit=new InMemoryAuditLog();const service=new GovernanceService(new RbacAuthorizer(new RoleCatalog([{id:'reader',displayName:'Reader',permissions:['platform.read']}])),audit);const actor={id:'u1',type:'user' as const,assignments:[{roleId:'reader',scope:{organizationId:'o1'}}]};assert.equal((await service.authorize({actor,permission:'platform.read',resourceScope:{organizationId:'o1'}})).allowed,true);await service.evaluateRelease({actorId:'u1',policy:{id:'p1',name:'P',rules:[{id:'r1',description:'fact exists',fact:'ready',operator:'eq',expected:true,severity:'block'}]},scope:{organizationId:'o1'},facts:[{key:'ready',value:true}]});assert.equal(audit.snapshot().length,2);assert.equal(audit.verify(),true);});
