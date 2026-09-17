/**
 * File: adapters/storage/s3/src/index.ts
 * Purpose: Provides an SDK-neutral S3-compatible artifact adapter boundary with network policy and time-limited presigned download support.
 * Author: Raushan Raj
 */
import type { AdapterDescriptor,AdapterHealth } from '../../../../packages/contracts/src/adapter';
import type { ArtifactDownloadGrant,ArtifactObjectMetadata,ArtifactStorageAdapter } from '../../../../packages/contracts/src/artifact';
import type { NetworkPolicy } from '../../../../packages/contracts/src/configuration';
import { assertNetworkAllowed } from '../../../../packages/security/src/network-policy';

export interface S3ArtifactClient{
  putObject(input:{bucket:string;key:string;contentType:string;body:AsyncIterable<Uint8Array>;metadata?:Record<string,string>}):Promise<{etag?:string;sizeBytes:number}>;
  getObject(input:{bucket:string;key:string}):Promise<AsyncIterable<Uint8Array>>;
  headObject(input:{bucket:string;key:string}):Promise<{contentType:string;sizeBytes:number;etag?:string;lastModified?:string;metadata?:Record<string,string>}|undefined>;
  deleteObject(input:{bucket:string;key:string}):Promise<void>;
  presignGetObject(input:{bucket:string;key:string;expiresInSeconds:number}):Promise<ArtifactDownloadGrant>;
  health?():Promise<boolean>;
}
export interface S3ArtifactStorageConfiguration{endpoint:string;bucket:string;networkPolicy:NetworkPolicy;allowInsecureLocalhost?:boolean;}
function safeGrant(grant:ArtifactDownloadGrant,allowLocal=false):void{const url=new URL(grant.url);const local=url.hostname==='localhost'||url.hostname==='127.0.0.1';if(url.protocol!=='https:'&&!(allowLocal&&local&&url.protocol==='http:'))throw new Error('Artifact download grants must use HTTPS except explicitly allowed localhost development URLs.');}

export class S3ArtifactStorageAdapter implements ArtifactStorageAdapter{
  readonly descriptor:AdapterDescriptor&{kind:'artifact-storage'}={id:'artifact.s3',kind:'artifact-storage',version:'1.0.0',displayName:'S3-Compatible Artifact Storage',description:'SDK-neutral S3-compatible object storage boundary.',capabilities:['put','get','head','delete','download-grant']};
  constructor(private readonly config:S3ArtifactStorageConfiguration,private readonly client:S3ArtifactClient){if(!config.bucket.trim())throw new Error('S3 artifact bucket is required.');new URL(config.endpoint);}
  private network():void{assertNetworkAllowed(this.config.endpoint,this.config.networkPolicy);}
  async health():Promise<AdapterHealth>{try{this.network();const healthy=this.client.health?await this.client.health():true;return{status:healthy?'healthy':'degraded',checkedAt:new Date().toISOString()};}catch(error){return{status:'unavailable',checkedAt:new Date().toISOString(),message:error instanceof Error?error.message:'S3 artifact storage unavailable'};}}
  async put(input:{key:string;contentType:string;body:AsyncIterable<Uint8Array>;metadata?:Record<string,string>}):Promise<ArtifactObjectMetadata>{this.network();const result=await this.client.putObject({bucket:this.config.bucket,...input});return{key:input.key,contentType:input.contentType,sizeBytes:result.sizeBytes,etag:result.etag,metadata:input.metadata};}
  async get(key:string){this.network();return this.client.getObject({bucket:this.config.bucket,key});}
  async head(key:string):Promise<ArtifactObjectMetadata|undefined>{this.network();const value=await this.client.headObject({bucket:this.config.bucket,key});return value?{key,...value}:undefined;}
  async delete(key:string):Promise<void>{this.network();await this.client.deleteObject({bucket:this.config.bucket,key});}
  async createDownloadGrant(input:{key:string;expiresInSeconds:number}):Promise<ArtifactDownloadGrant>{this.network();const grant=await this.client.presignGetObject({bucket:this.config.bucket,...input});safeGrant(grant,this.config.allowInsecureLocalhost);return grant;}
}
