/**
 * File: tests/governance/audit.test.ts
 * Purpose: Verifies chained audit integrity and recursive sensitive-metadata redaction.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { InMemoryAuditLog } from '../../packages/governance/src';
test('audit log creates an ordered verifiable hash chain',async()=>{const log=new InMemoryAuditLog();await log.append({id:'a1',timestamp:'2026-09-17T00:00:00.000Z',actorId:'u1',action:'read',resource:'r1',outcome:'succeeded'});await log.append({id:'a2',timestamp:'2026-09-17T00:00:01.000Z',actorId:'u1',action:'write',resource:'r2',outcome:'allowed'});const records=log.snapshot();assert.equal(records[1]?.previousHash,records[0]?.hash);assert.equal(log.verify(),true);});
test('audit log redacts nested sensitive metadata',async()=>{const log=new InMemoryAuditLog();const record=await log.append({id:'a1',timestamp:new Date().toISOString(),actorId:'u1',action:'x',resource:'r',outcome:'succeeded',metadata:{apiKey:'secret',nested:{authorization:'Bearer x'},safe:'ok'}});assert.equal((record.metadata as any).apiKey,'[REDACTED]');assert.equal((record.metadata as any).nested.authorization,'[REDACTED]');assert.equal((record.metadata as any).safe,'ok');});
