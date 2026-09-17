/**
 * File: adapters/storage/azure-blob/src/index.ts
 * Purpose: Provides an SDK-neutral Azure Blob artifact adapter boundary designed for managed-identity/user-delegation download grants.
 * Author: Raushan Raj
 */
import type { AdapterDescriptor,AdapterHealth } from '../../../../packages/contracts/src/adapter';
import type { ArtifactDownloadGrant,ArtifactObjectMetadata,ArtifactStorageAdapter } from '../../../../packages/contracts/src/artifact';
import type { NetworkPolicy } from '../../../../packages/contracts/src/configuration';
import { assertNetworkAllowed } from '../../../../packages/security/src/network-policy';

export interface AzureBlobArtifactClient{
  putBlob(input:{container:string;blobName:string;contentType:string;body:AsyncIterable<Uint8Array>;metadata?:Record<string,string>}):Promise<{etag?:string;sizeBytes:number}>;
  getBlob(input:{container:string;blobName:string}):Promise<AsyncIterable<Uint8Array>>;
  headBlob(input:{container:string;blobName:string}):Promise<{contentType:string;sizeBytes:number;etag?:string;lastModified?:string;metadata?:Record<string,string>}|undefined>;
  deleteBlob(input:{container:string;blobName:string}):Promise<void>;
  createReadGrant(input:{container:string;blobName:string;expiresInSeconds:number}):Promise<ArtifactDownloadGrant>;
  health?():Promise<boolean>;
}
export interface AzureBlobArtifactStorageConfiguration{endpoint:string;container:string;networkPolicy:NetworkPolicy;allowInsecureLocalhost?:boolean;}
function safeGrant(grant:ArtifactDownloadGrant,allowLocal=false):void{const url=new URL(grant.url);const local=url.hostname==='localhost'||url.hostname==='127.0.0.1';if(url.protocol!=='https:'&&!(allowLocal&&local&&url.protocol==='http:'))throw new Error('Artifact download grants must use HTTPS except explicitly allowed localhost development URLs.');}

export class AzureBlobArtifactStorageAdapter implements ArtifactStorageAdapter{
  readonly descriptor:AdapterDescriptor&{kind:'artifact-storage'}={id:'artifact.azure-blob',kind:'artifact-storage',version:'1.0.0',displayName:'Azure Blob Artifact Storage',description:'SDK-neutral Azure Blob storage boundary for managed identity and user-delegation workflows.',capabilities:['put','get','head','delete','download-grant']};
  constructor(private readonly config:AzureBlobArtifactStorageConfiguration,private readonly client:AzureBlobArtifactClient){if(!config.container.trim())throw new Error('Azure Blob artifact container is required.');new URL(config.endpoint);}
  private network():void{assertNetworkAllowed(this.config.endpoint,this.config.networkPolicy);}
  async health():Promise<AdapterHealth>{try{this.network();const healthy=this.client.health?await this.client.health():true;return{status:healthy?'healthy':'degraded',checkedAt:new Date().toISOString()};}catch(error){return{status:'unavailable',checkedAt:new Date().toISOString(),message:error instanceof Error?error.message:'Azure Blob artifact storage unavailable'};}}
  async put(input:{key:string;contentType:string;body:AsyncIterable<Uint8Array>;metadata?:Record<string,string>}):Promise<ArtifactObjectMetadata>{this.network();const result=await this.client.putBlob({container:this.config.container,blobName:input.key,contentType:input.contentType,body:input.body,metadata:input.metadata});return{key:input.key,contentType:input.contentType,sizeBytes:result.sizeBytes,etag:result.etag,metadata:input.metadata};}
  async get(key:string){this.network();return this.client.getBlob({container:this.config.container,blobName:key});}
  async head(key:string):Promise<ArtifactObjectMetadata|undefined>{this.network();const value=await this.client.headBlob({container:this.config.container,blobName:key});return value?{key,...value}:undefined;}
  async delete(key:string):Promise<void>{this.network();await this.client.deleteBlob({container:this.config.container,blobName:key});}
  async createDownloadGrant(input:{key:string;expiresInSeconds:number}):Promise<ArtifactDownloadGrant>{this.network();const grant=await this.client.createReadGrant({container:this.config.container,blobName:input.key,expiresInSeconds:input.expiresInSeconds});safeGrant(grant,this.config.allowInsecureLocalhost);return grant;}
}
