/**
 * File: tests/contracts/registry.test.ts
 * Purpose: Tests adapter registry uniqueness, lookup, listing, and replacement behavior.
 * Author: Raushan Raj
 */
import test from 'node:test'; import assert from 'node:assert/strict'; import { AdapterRegistry } from '../../packages/core/src/adapter-registry';
const mk=(id:string,kind:any='runner')=>({descriptor:{id,kind,version:'1',displayName:id,description:id,capabilities:[]},health:async()=>({status:'healthy' as const,checkedAt:new Date().toISOString()})});
test('registry rejects duplicate adapter ids',()=>{const r=new AdapterRegistry();r.register(mk('a'));assert.throws(()=>r.register(mk('a')),/already registered/);});
test('registry filters by kind',()=>{const r=new AdapterRegistry();r.register(mk('a','runner'));r.register(mk('b','automation'));assert.equal(r.list('runner').length,1);});

