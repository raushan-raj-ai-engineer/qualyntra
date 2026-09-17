/**
 * File: tests/artifacts/local-storage.test.ts
 * Purpose: Verifies local artifact storage path confinement, atomic cleanup, streaming round trips, metadata, and idempotent deletion.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';import { promises as fs } from 'node:fs';import path from 'node:path';import { tmpdir } from 'node:os';
import { LocalArtifactStorageAdapter } from '../../adapters/storage/local/src/index';
async function* bytes(value:string){yield new TextEncoder().encode(value);}async function text(body:AsyncIterable<Uint8Array>){let out='';for await(const chunk of body)out+=new TextDecoder().decode(chunk);return out;}
async function root(){return fs.mkdtemp(path.join(tmpdir(),'qualyntra-artifacts-'));}

test('local storage streams bytes and durable sidecar metadata under a confined root',async()=>{const dir=await root();try{const adapter=new LocalArtifactStorageAdapter(dir);const key='tenant/0123456789abcdef01234567/art_123e4567-e89b-12d3-a456-426614174000';const put=await adapter.put({key,contentType:'text/plain',body:bytes('hello'),metadata:{artifactId:'a'}});assert.equal(put.sizeBytes,5);assert.equal(await text(await adapter.get(key)),'hello');const head=await adapter.head(key);assert.equal(head?.contentType,'text/plain');assert.equal(head?.metadata?.artifactId,'a');await adapter.delete(key);assert.equal(await adapter.head(key),undefined);await adapter.delete(key);}finally{await fs.rm(dir,{recursive:true,force:true});}});

test('local storage rejects arbitrary and traversal-style storage keys',async()=>{const dir=await root();try{const adapter=new LocalArtifactStorageAdapter(dir);await assert.rejects(()=>adapter.put({key:'../escape',contentType:'text/plain',body:bytes('x')}),/key is invalid/);await assert.rejects(()=>adapter.get('/absolute'),/key is invalid/);}finally{await fs.rm(dir,{recursive:true,force:true});}});

test('local storage rejects duplicate object creation instead of overwriting evidence',async()=>{const dir=await root();try{const adapter=new LocalArtifactStorageAdapter(dir);const key='tenant/0123456789abcdef01234567/art_123e4567-e89b-12d3-a456-426614174001';await adapter.put({key,contentType:'text/plain',body:bytes('first')});await assert.rejects(()=>adapter.put({key,contentType:'text/plain',body:bytes('second')}));assert.equal(await text(await adapter.get(key)),'first');}finally{await fs.rm(dir,{recursive:true,force:true});}});
