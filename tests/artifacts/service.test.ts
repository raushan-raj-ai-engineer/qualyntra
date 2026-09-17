/**
 * File: tests/artifacts/service.test.ts
 * Purpose: Verifies tenant isolation, streaming integrity, retention, grant bounds, metadata redaction, and failure cleanup in the artifact service.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { AdapterRegistry } from '../../packages/core/src/adapter-registry';
import type { ArtifactDownloadGrant,ArtifactObjectMetadata,ArtifactStorageAdapter } from '../../packages/contracts/src/artifact';
import { InMemoryArtifactCatalog } from '../../packages/artifacts/src/catalog';
import { ArtifactService } from '../../packages/artifacts/src/service';
import { InMemoryAuditLog } from '../../packages/governance/src/audit-log';

const scope={organizationId:'org-1',workspaceId:'ws-1',projectId:'proj-1'};
const other={organizationId:'org-2',workspaceId:'ws-2',projectId:'proj-2'};
async function* bytes(value:string){yield new TextEncoder().encode(value);}
async function collect(body:AsyncIterable<Uint8Array>){const chunks:number[]=[];for await(const chunk of body)chunks.push(...chunk);return new Uint8Array(chunks);}

class MemoryStorage implements ArtifactStorageAdapter{
  readonly descriptor={id:'artifact.memory',kind:'artifact-storage' as const,version:'1',displayName:'Memory',description:'test',capabilities:['put','get','delete','grant']};
  readonly objects=new Map<string,Uint8Array>();
  corrupt=false;deleted:string[]=[];
  async health(){return{status:'healthy' as const,checkedAt:new Date().toISOString()};}
  async put(input:{key:string;contentType:string;body:AsyncIterable<Uint8Array>;metadata?:Record<string,string>}):Promise<ArtifactObjectMetadata>{const data=await collect(input.body);this.objects.set(input.key,data);return{key:input.key,contentType:input.contentType,sizeBytes:data.length};}
  async get(key:string){const data=this.objects.get(key);if(!data)throw new Error('missing');const out=this.corrupt?new TextEncoder().encode('corrupt'):data;return bytes(new TextDecoder().decode(out));}
  async head(key:string){const data=this.objects.get(key);return data?{key,contentType:'text/plain',sizeBytes:data.length}:undefined;}
  async delete(key:string){this.deleted.push(key);this.objects.delete(key);}
  async createDownloadGrant(input:{key:string;expiresInSeconds:number}):Promise<ArtifactDownloadGrant>{return{url:`https://download.invalid/${input.key}`,expiresAt:new Date(Date.now()+input.expiresInSeconds*1000).toISOString()};}
}
function service(maxArtifactBytes=1024){const registry=new AdapterRegistry();const storage=new MemoryStorage();registry.register(storage);const catalog=new InMemoryArtifactCatalog();const audit=new InMemoryAuditLog();return{storage,catalog,audit,service:new ArtifactService(registry,catalog,{maxArtifactBytes,defaultRetentionDays:30,maxRetentionDays:365,maxDownloadGrantSeconds:900,redactKeys:['token','password','authorization']},audit)};}

test('artifact service streams content, hashes it, redacts metadata, and records audit evidence',async()=>{const ctx=service();const record=await ctx.service.store({storageAdapterId:'artifact.memory',scope,body:bytes('hello'),kind:'log',name:'run.log',contentType:'text/plain',actorId:'svc',runId:'r1',metadata:{token:'secret',safe:'ok'}});assert.equal(record.sizeBytes,5);assert.equal(record.sha256.length,64);assert.equal(record.metadata?.token,'[REDACTED]');assert.equal(record.metadata?.safe,'ok');assert.match(record.storageKey,/^tenant\/[a-f0-9]{24}\/art_/);assert.equal(record.storageKey.includes('org-1'),false);assert.equal((await ctx.audit.list(scope)).at(-1)?.action,'artifact.store');});

test('artifact catalog enforces tenant isolation and run filtering',async()=>{const ctx=service();await ctx.service.store({storageAdapterId:'artifact.memory',scope,body:bytes('a'),kind:'log',name:'a.log',contentType:'text/plain',actorId:'svc',runId:'r1'});assert.equal((await ctx.service.list(other,{offset:0,limit:10})).total,0);assert.equal((await ctx.service.list(scope,{offset:0,limit:10,runId:'r2'})).total,0);assert.equal((await ctx.service.list(scope,{offset:0,limit:10,runId:'r1'})).total,1);});

test('artifact service rejects empty and oversized streams and cleans partial storage',async()=>{const empty=service();await assert.rejects(()=>empty.service.store({storageAdapterId:'artifact.memory',scope,body:bytes(''),kind:'log',name:'a.log',contentType:'text/plain',actorId:'svc'}),/Empty artifacts/);assert.equal(empty.storage.objects.size,0);const small=service(3);await assert.rejects(()=>small.service.store({storageAdapterId:'artifact.memory',scope,body:bytes('four'),kind:'log',name:'a.log',contentType:'text/plain',actorId:'svc'}),/size limit/);assert.equal(small.storage.objects.size,0);});

test('verified downloads fail closed when stored bytes no longer match metadata',async()=>{const ctx=service();const record=await ctx.service.store({storageAdapterId:'artifact.memory',scope,body:bytes('hello'),kind:'trace',name:'trace.zip',contentType:'application/zip',actorId:'svc'});const ok=await collect(await ctx.service.downloadVerified(scope,record.id));assert.equal(new TextDecoder().decode(ok),'hello');ctx.storage.corrupt=true;await assert.rejects(async()=>{await collect(await ctx.service.downloadVerified(scope,record.id));},/integrity verification failed/);});

test('download grants are bounded, audited, and never persisted as artifact metadata',async()=>{const ctx=service();const record=await ctx.service.store({storageAdapterId:'artifact.memory',scope,body:bytes('x'),kind:'screenshot',name:'a.png',contentType:'image/png',actorId:'svc'});await assert.rejects(()=>ctx.service.createDownloadGrant({scope,id:record.id,expiresInSeconds:901,actorId:'user'}),/between 1 and 900/);const grant=await ctx.service.createDownloadGrant({scope,id:record.id,expiresInSeconds:60,actorId:'user'});assert.match(grant.url,/^https:/);const stored=await ctx.service.get(scope,record.id);assert.equal(JSON.stringify(stored).includes(grant.url),false);assert.equal((await ctx.audit.list(scope)).at(-1)?.action,'artifact.download-grant');});

test('retention sweep removes expired artifacts but leaves non-expiring artifacts',async()=>{const ctx=service();const base=new Date('2026-01-01T00:00:00.000Z');const expired=await ctx.service.store({storageAdapterId:'artifact.memory',scope,body:bytes('old'),kind:'log',name:'old.log',contentType:'text/plain',actorId:'svc',retentionDays:1},base);const keep=await ctx.service.store({storageAdapterId:'artifact.memory',scope,body:bytes('keep'),kind:'log',name:'keep.log',contentType:'text/plain',actorId:'svc',retentionDays:0},base);const result=await ctx.service.sweepExpired({now:new Date('2026-01-03T00:00:00.000Z'),limit:10,actorId:'retention'});assert.deepEqual(result,{deleted:1,failed:0});assert.equal(await ctx.service.get(scope,expired.id),undefined);assert.ok(await ctx.service.get(scope,keep.id));});

test('artifact service refuses adapters that are not registered as artifact storage',async()=>{const registry=new AdapterRegistry();registry.register({descriptor:{id:'not-storage',kind:'runner',version:'1',displayName:'r',description:'r',capabilities:[]},async health(){return{status:'healthy',checkedAt:new Date().toISOString()};}});const svc=new ArtifactService(registry,new InMemoryArtifactCatalog(),{maxArtifactBytes:10,defaultRetentionDays:1,maxRetentionDays:10,maxDownloadGrantSeconds:60,redactKeys:[]});await assert.rejects(()=>svc.store({storageAdapterId:'not-storage',scope,body:bytes('x'),kind:'log',name:'x.log',contentType:'text/plain',actorId:'svc'}),/not artifact storage/);});
