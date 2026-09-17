/**
 * File: packages/artifacts/src/service.ts
 * Purpose: Stores, verifies, grants, lists, and deletes tenant-scoped artifacts with streaming hashes, retention, redaction, and audit evidence.
 * Author: Raushan Raj
 */
import { createHash } from 'node:crypto';
import type { AdapterRegistry } from '../../core/src/adapter-registry';
import { createId } from '../../core/src/ids';
import type { ArtifactCatalog,ArtifactDownloadGrant,ArtifactKind,ArtifactRecord,ArtifactStorageAdapter } from '../../contracts/src/artifact';
import type { AuditSink,TenantScope } from '../../contracts/src/governance';
import { scopeKey,validateScope } from '../../governance/src/tenancy';
import { redact } from '../../security/src/redaction';

export interface ArtifactServiceConfiguration{
  maxArtifactBytes:number;
  defaultRetentionDays:number;
  maxRetentionDays:number;
  maxDownloadGrantSeconds:number;
  redactKeys:string[];
}

export interface StoreArtifactInput{
  storageAdapterId:string;
  scope:TenantScope;
  body:AsyncIterable<Uint8Array>;
  kind:ArtifactKind;
  name:string;
  contentType:string;
  actorId:string;
  correlationId?:string;
  runId?:string;
  evidenceId?:string;
  retentionDays?:number;
  metadata?:Record<string,unknown>;
}

function validateName(name:string):void{
  if(!name.trim())throw new Error('Artifact name is required.');
  if(name.length>255)throw new Error('Artifact name exceeds 255 characters.');
  if(/[\u0000-\u001f\u007f]/.test(name))throw new Error('Artifact name contains control characters.');
}
function validateContentType(value:string):void{
  if(!/^[A-Za-z0-9.+-]+\/[A-Za-z0-9.+_-]+(?:;[ A-Za-z0-9=._+-]+)?$/.test(value))throw new Error('Artifact content type is invalid.');
}
function retentionUntil(days:number|undefined,config:ArtifactServiceConfiguration,now:Date):string|undefined{
  const value=days??config.defaultRetentionDays;
  if(value===0)return undefined;
  if(!Number.isInteger(value)||value<1||value>config.maxRetentionDays)throw new Error(`Artifact retentionDays must be between 1 and ${config.maxRetentionDays}, or 0 to disable expiry.`);
  return new Date(now.getTime()+value*86400000).toISOString();
}
function storageKey(scope:TenantScope,id:string):string{
  const scopeDigest=createHash('sha256').update(scopeKey(scope)).digest('hex').slice(0,24);
  return `tenant/${scopeDigest}/${id}`;
}
function storageAdapter(registry:AdapterRegistry,id:string):ArtifactStorageAdapter{
  const adapter=registry.get<ArtifactStorageAdapter>(id);
  if(adapter.descriptor.kind!=='artifact-storage')throw new Error(`Adapter is not artifact storage: ${id}`);
  return adapter;
}

export class ArtifactService{
  constructor(private readonly registry:AdapterRegistry,private readonly catalog:ArtifactCatalog,private readonly config:ArtifactServiceConfiguration,private readonly audit?:AuditSink){
    if(config.maxArtifactBytes<1)throw new Error('maxArtifactBytes must be at least 1.');
    if(config.defaultRetentionDays<0||config.maxRetentionDays<1||config.defaultRetentionDays>config.maxRetentionDays)throw new Error('Artifact retention configuration is invalid.');
    if(config.maxDownloadGrantSeconds<1)throw new Error('maxDownloadGrantSeconds must be at least 1.');
  }

  async store(input:StoreArtifactInput,now=new Date()):Promise<ArtifactRecord>{
    validateScope(input.scope);validateName(input.name);validateContentType(input.contentType);
    const adapter=storageAdapter(this.registry,input.storageAdapterId);
    const id=createId('art');
    const key=storageKey(input.scope,id);
    const hash=createHash('sha256');
    let sizeBytes=0;
    const body=(async function* (source:AsyncIterable<Uint8Array>,max:number){
      for await(const chunk of source){
        if(!(chunk instanceof Uint8Array))throw new Error('Artifact body chunks must be Uint8Array values.');
        sizeBytes+=chunk.byteLength;
        if(sizeBytes>max)throw new Error(`Artifact exceeds configured size limit (${sizeBytes} > ${max} bytes).`);
        hash.update(Buffer.from(chunk));
        yield chunk;
      }
    })(input.body,this.config.maxArtifactBytes);
    try{
      await adapter.put({key,contentType:input.contentType,body,metadata:{artifactId:id}});
    }catch(error){
      try{await adapter.delete(key);}catch{}
      throw error;
    }
    if(sizeBytes===0){try{await adapter.delete(key);}catch{}throw new Error('Empty artifacts are not accepted.');}
    const record:ArtifactRecord={
      id,scope:structuredClone(input.scope),kind:input.kind,name:input.name,contentType:input.contentType,sizeBytes,
      sha256:hash.digest('hex'),storageAdapterId:adapter.descriptor.id,storageKey:key,createdAt:now.toISOString(),
      retentionUntil:retentionUntil(input.retentionDays,this.config,now),
      metadata:redact(input.metadata??{},this.config.redactKeys) as Record<string,unknown>
    };
    if(input.runId)record.runId=input.runId;if(input.evidenceId)record.evidenceId=input.evidenceId;
    try{await this.catalog.save(record);}catch(error){try{await adapter.delete(key);}catch{}throw error;}
    await this.audit?.append({id:createId('audit'),timestamp:now.toISOString(),actorId:input.actorId,action:'artifact.store',resource:`artifact:${record.id}`,outcome:'succeeded',correlationId:input.correlationId,scope:input.scope,metadata:{kind:record.kind,sizeBytes:record.sizeBytes,storageAdapterId:record.storageAdapterId,sha256:record.sha256}});
    return structuredClone(record);
  }

  async get(scope:TenantScope,id:string):Promise<ArtifactRecord|undefined>{validateScope(scope);return this.catalog.get(scope,id);}
  async list(scope:TenantScope,input:{offset:number;limit:number;runId?:string}){validateScope(scope);return this.catalog.list(scope,input);}

  async downloadVerified(scope:TenantScope,id:string):Promise<AsyncIterable<Uint8Array>>{
    const record=await this.catalog.get(scope,id);if(!record)throw new Error(`Artifact not found: ${id}`);
    const adapter=storageAdapter(this.registry,record.storageAdapterId);
    const source=await adapter.get(record.storageKey);
    const expectedHash=record.sha256;const expectedSize=record.sizeBytes;
    return(async function*(){
      const hash=createHash('sha256');let bytes=0;
      for await(const chunk of source){bytes+=chunk.byteLength;hash.update(Buffer.from(chunk));yield chunk;}
      const actual=hash.digest('hex');
      if(bytes!==expectedSize||actual!==expectedHash)throw new Error('Artifact integrity verification failed.');
    })();
  }

  async createDownloadGrant(input:{scope:TenantScope;id:string;expiresInSeconds:number;actorId:string;correlationId?:string},now=new Date()):Promise<ArtifactDownloadGrant>{
    if(!Number.isInteger(input.expiresInSeconds)||input.expiresInSeconds<1||input.expiresInSeconds>this.config.maxDownloadGrantSeconds)throw new Error(`Download grant expiry must be between 1 and ${this.config.maxDownloadGrantSeconds} seconds.`);
    const record=await this.catalog.get(input.scope,input.id);if(!record)throw new Error(`Artifact not found: ${input.id}`);
    const adapter=storageAdapter(this.registry,record.storageAdapterId);
    if(!adapter.createDownloadGrant)throw new Error(`Artifact storage adapter does not support download grants: ${adapter.descriptor.id}`);
    const grant=await adapter.createDownloadGrant({key:record.storageKey,expiresInSeconds:input.expiresInSeconds});
    const expires=Date.parse(grant.expiresAt);if(!Number.isFinite(expires)||expires<=now.getTime()||expires>now.getTime()+this.config.maxDownloadGrantSeconds*1000+5000)throw new Error('Artifact storage adapter returned an invalid download-grant expiry.');
    await this.audit?.append({id:createId('audit'),timestamp:now.toISOString(),actorId:input.actorId,action:'artifact.download-grant',resource:`artifact:${record.id}`,outcome:'succeeded',correlationId:input.correlationId,scope:input.scope,metadata:{storageAdapterId:record.storageAdapterId,expiresAt:grant.expiresAt}});
    return grant;
  }

  async delete(input:{scope:TenantScope;id:string;actorId:string;correlationId?:string},now=new Date()):Promise<void>{
    const record=await this.catalog.get(input.scope,input.id);if(!record)return;
    await storageAdapter(this.registry,record.storageAdapterId).delete(record.storageKey);
    await this.catalog.delete(input.scope,input.id);
    await this.audit?.append({id:createId('audit'),timestamp:now.toISOString(),actorId:input.actorId,action:'artifact.delete',resource:`artifact:${record.id}`,outcome:'succeeded',correlationId:input.correlationId,scope:input.scope,metadata:{storageAdapterId:record.storageAdapterId}});
  }

  async sweepExpired(input:{now?:Date;limit:number;actorId:string;correlationId?:string}):Promise<{deleted:number;failed:number}>{
    const now=input.now??new Date();const expired=await this.catalog.listExpired(now.toISOString(),input.limit);let deleted=0,failed=0;
    for(const record of expired){
      try{await storageAdapter(this.registry,record.storageAdapterId).delete(record.storageKey);await this.catalog.delete(record.scope,record.id);deleted++;await this.audit?.append({id:createId('audit'),timestamp:now.toISOString(),actorId:input.actorId,action:'artifact.retention-delete',resource:`artifact:${record.id}`,outcome:'succeeded',correlationId:input.correlationId,scope:record.scope,metadata:{storageAdapterId:record.storageAdapterId}});}catch{failed++;}
    }
    return{deleted,failed};
  }
}
