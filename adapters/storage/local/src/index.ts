/**
 * File: adapters/storage/local/src/index.ts
 * Purpose: Implements a tenant-safe local-filesystem artifact storage adapter for development and on-prem reference deployments.
 * Author: Raushan Raj
 */
import { promises as fs,createReadStream } from 'node:fs';
import path from 'node:path';
import type { AdapterDescriptor,AdapterHealth } from '../../../../packages/contracts/src/adapter';
import type { ArtifactObjectMetadata,ArtifactStorageAdapter } from '../../../../packages/contracts/src/artifact';

function validateKey(key:string):void{if(!/^tenant\/[a-f0-9]{24}\/art_[A-Za-z0-9-]+$/.test(key))throw new Error('Artifact storage key is invalid.');}
function resolveWithin(root:string,key:string):string{validateKey(key);const resolvedRoot=path.resolve(root);const file=path.resolve(resolvedRoot,key);if(file!==resolvedRoot&&!file.startsWith(`${resolvedRoot}${path.sep}`))throw new Error('Artifact storage key escapes configured root.');return file;}

export class LocalArtifactStorageAdapter implements ArtifactStorageAdapter{
  readonly descriptor:AdapterDescriptor&{kind:'artifact-storage'};
  constructor(private readonly rootDirectory:string,id='artifact.local'){
    if(!rootDirectory.trim())throw new Error('Local artifact rootDirectory is required.');
    this.descriptor={id,kind:'artifact-storage',version:'1.0.0',displayName:'Local Artifact Storage',description:'Filesystem-backed artifact storage for local development and controlled on-prem deployments.',capabilities:['put','get','head','delete','streaming-read','streaming-write']};
  }
  async health():Promise<AdapterHealth>{try{await fs.mkdir(path.resolve(this.rootDirectory),{recursive:true,mode:0o700});return{status:'healthy',checkedAt:new Date().toISOString()};}catch(error){return{status:'unavailable',checkedAt:new Date().toISOString(),message:error instanceof Error?error.message:'Local artifact directory unavailable'};}}
  async put(input:{key:string;contentType:string;body:AsyncIterable<Uint8Array>;metadata?:Record<string,string>}):Promise<ArtifactObjectMetadata>{
    const file=resolveWithin(this.rootDirectory,input.key);const sidecar=`${file}.meta.json`;await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});let handle:any;let size=0;let created=false;let sidecarCreated=false;
    try{handle=await fs.open(file,'wx',0o600);created=true;for await(const chunk of input.body){await handle.write(Buffer.from(chunk));size+=chunk.byteLength;}await handle.sync();await handle.close();handle=undefined;const metadata={key:input.key,contentType:input.contentType,sizeBytes:size,lastModified:new Date().toISOString(),metadata:input.metadata??{}};await fs.writeFile(sidecar,JSON.stringify(metadata),{encoding:'utf8',mode:0o600,flag:'wx'});sidecarCreated=true;return metadata;}catch(error){try{if(handle)await handle.close();}catch{}if(created){try{await fs.unlink(file);}catch{}}if(sidecarCreated){try{await fs.unlink(sidecar);}catch{}}throw error;}
  }
  async get(key:string):Promise<AsyncIterable<Uint8Array>>{const file=resolveWithin(this.rootDirectory,key);await fs.stat(file);const stream=createReadStream(file);return(async function*(){for await(const chunk of stream)yield new Uint8Array(chunk as any);})();}
  async head(key:string):Promise<ArtifactObjectMetadata|undefined>{const file=resolveWithin(this.rootDirectory,key);try{const [stat,metaText]=await Promise.all([fs.stat(file),fs.readFile(`${file}.meta.json`,'utf8')]);const meta=JSON.parse(metaText) as ArtifactObjectMetadata;return{...meta,sizeBytes:stat.size,lastModified:stat.mtime.toISOString()};}catch(error:any){if(error?.code==='ENOENT')return undefined;throw error;}}
  async delete(key:string):Promise<void>{const file=resolveWithin(this.rootDirectory,key);await Promise.all([fs.unlink(file).catch((error:any)=>{if(error?.code!=='ENOENT')throw error;}),fs.unlink(`${file}.meta.json`).catch((error:any)=>{if(error?.code!=='ENOENT')throw error;})]);}
}
