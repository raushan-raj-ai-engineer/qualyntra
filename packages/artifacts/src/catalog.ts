/**
 * File: packages/artifacts/src/catalog.ts
 * Purpose: Provides the reference tenant-isolated in-memory artifact metadata catalog for local use and contract tests.
 * Author: Raushan Raj
 */
import type { ArtifactCatalog,ArtifactRecord } from '../../contracts/src/artifact';
import type { TenantScope } from '../../contracts/src/governance';
import { scopeContains,scopeKey } from '../../governance/src/tenancy';

function key(scope:TenantScope,id:string):string{return `${scopeKey(scope)}::${id}`;}

export class InMemoryArtifactCatalog implements ArtifactCatalog{
  private readonly records=new Map<string,ArtifactRecord>();
  async save(record:ArtifactRecord):Promise<ArtifactRecord>{
    const recordKey=key(record.scope,record.id);
    if(this.records.has(recordKey))throw new Error(`Artifact already exists: ${record.id}`);
    this.records.set(recordKey,structuredClone(record));
    return structuredClone(record);
  }
  async get(scope:TenantScope,id:string):Promise<ArtifactRecord|undefined>{
    const record=this.records.get(key(scope,id));
    return record?structuredClone(record):undefined;
  }
  async list(scope:TenantScope,input:{offset:number;limit:number;runId?:string}){
    if(input.offset<0||input.limit<1)throw new Error('Artifact pagination requires offset >= 0 and limit >= 1.');
    const values=[...this.records.values()]
      .filter(record=>scopeContains(scope,record.scope)&&(!input.runId||record.runId===input.runId))
      .sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    return{items:structuredClone(values.slice(input.offset,input.offset+input.limit)),offset:input.offset,limit:input.limit,total:values.length};
  }
  async listExpired(now:string,limit:number):Promise<ArtifactRecord[]>{
    if(limit<1)throw new Error('Retention scan limit must be at least 1.');
    const nowMs=Date.parse(now);
    if(!Number.isFinite(nowMs))throw new Error('Retention scan timestamp must be valid ISO time.');
    return structuredClone([...this.records.values()]
      .filter(record=>record.retentionUntil!==undefined&&Date.parse(record.retentionUntil)<=nowMs)
      .sort((a,b)=>(a.retentionUntil??'').localeCompare(b.retentionUntil??''))
      .slice(0,limit));
  }
  async delete(scope:TenantScope,id:string):Promise<void>{this.records.delete(key(scope,id));}
}
