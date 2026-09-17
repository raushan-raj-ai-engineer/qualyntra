/**
 * File: tests/persistence/driver.test.ts
 * Purpose: Verifies PostgreSQL transaction wrapping commits successful work and rolls back failures without requiring the pg package.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { wrapNodePostgresPool } from '../../adapters/persistence/postgres/src/driver';
function pool(fail=false){const calls:string[]=[];const client={async query(text:string){calls.push(text);if(fail&&text==='WORK')throw new Error('boom');return{rows:[],rowCount:0};},release(){calls.push('RELEASE');}};return{calls,pool:{async query(){return{rows:[],rowCount:0};},async connect(){return client;},async end(){calls.push('END');}}};}
test('transaction wrapper commits and releases on success',async()=>{const fake=pool();const db=wrapNodePostgresPool(fake.pool);await db.transaction(async tx=>{await tx.query('WORK');});assert.deepEqual(fake.calls,['BEGIN','WORK','COMMIT','RELEASE']);});
test('transaction wrapper rolls back and releases on failure',async()=>{const fake=pool(true);const db=wrapNodePostgresPool(fake.pool);await assert.rejects(()=>db.transaction(async tx=>{await tx.query('WORK');}),/boom/);assert.deepEqual(fake.calls,['BEGIN','WORK','ROLLBACK','RELEASE']);});
