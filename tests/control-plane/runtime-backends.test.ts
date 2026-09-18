/**
 * File: tests/control-plane/runtime-backends.test.ts
 * Purpose: Verifies control-plane runtime backend selection remains memory-safe by default and fails closed for incomplete PostgreSQL configuration.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { createControlPlaneRuntimeBackends } from '../../apps/control-plane/src/runtime-backends';

test('runtime backend factory defaults to isolated in-memory reference state',async()=>{const backends=await createControlPlaneRuntimeBackends({env:{}});assert.equal(backends.mode,'memory');assert.equal((await backends.health()).status,'healthy');await backends.close();});
test('runtime backend factory rejects unknown backend modes',async()=>{await assert.rejects(()=>createControlPlaneRuntimeBackends({env:{QUALYNTRA_RUNTIME_BACKEND:'redis'}}),/memory or postgres/);});
test('postgres runtime backend requires a mounted connection-string secret when no database is injected',async()=>{await assert.rejects(()=>createControlPlaneRuntimeBackends({env:{QUALYNTRA_RUNTIME_BACKEND:'postgres'}}),/CONNECTION_STRING_FILE/);});

test('postgres runtime backend can be composed around an injected database without exposing connection secrets',async()=>{const calls:string[]=[];const database={async query(text:string){calls.push(text);return{rows:[],rowCount:0};},async transaction<T>(work:any){return work({id:'tx',query:this.query.bind(this)});},async close(){calls.push('close');}};const backends=await createControlPlaneRuntimeBackends({env:{QUALYNTRA_RUNTIME_BACKEND:'postgres',QUALYNTRA_POSTGRES_MIGRATE_ON_START:'false'},database:database as any});assert.equal(backends.mode,'postgres');assert.equal((await backends.health()).status,'healthy');await backends.close();assert.equal(calls.includes('SELECT 1 AS ok'),true);assert.equal(calls.includes('close'),true);});
