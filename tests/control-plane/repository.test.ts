/**
 * File: tests/control-plane/repository.test.ts
 * Purpose: Verifies storage-neutral in-memory repository tenant isolation, paging, and exact-scope idempotency lookup.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { InMemoryControlPlaneRepository } from '../../packages/control-plane/src';
function run(id:string,projectId:string,key?:string){return{id,scope:{organizationId:'o1',workspaceId:'w1',projectId},request:{runId:id,projectId,runtime:{language:'typescript',runner:'playwright-test'}},status:'queued' as const,createdAt:'2026-09-17T00:00:00.000Z',updatedAt:'2026-09-17T00:00:00.000Z',idempotencyKey:key,requestFingerprint:`fp-${id}`};}
test('repository lists only resources visible from requested tenant scope',async()=>{const repo=new InMemoryControlPlaneRepository();await repo.createRun(run('r1','p1'));await repo.createRun(run('r2','p2'));assert.equal((await repo.listRuns({organizationId:'o1',workspaceId:'w1',projectId:'p1'},{offset:0,limit:10})).total,1);assert.equal((await repo.listRuns({organizationId:'o1',workspaceId:'w1'},{offset:0,limit:10})).total,2);});
test('idempotency lookup is exact-scope and cannot collide across projects',async()=>{const repo=new InMemoryControlPlaneRepository();await repo.createRun(run('r1','p1','same'));await repo.createRun(run('r2','p2','same'));assert.equal((await repo.findRunByIdempotency({organizationId:'o1',workspaceId:'w1',projectId:'p2'},'same'))?.id,'r2');});
test('repository paging returns stable bounded slices',async()=>{const repo=new InMemoryControlPlaneRepository();for(const id of ['r1','r2','r3'])await repo.createRun(run(id,'p1'));const result=await repo.listRuns({organizationId:'o1'},{offset:1,limit:1});assert.equal(result.total,3);assert.equal(result.items.length,1);assert.equal(result.offset,1);});
