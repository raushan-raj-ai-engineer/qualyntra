/**
 * File: adapters/storage/s3/src/aws-sdk-client.ts
 * Purpose: Implements the S3 artifact-client boundary with the AWS SDK while loading vendor packages only inside the S3 adapter.
 * Author: Raushan Raj
 */
import type { ArtifactDownloadGrant } from '../../../../packages/contracts/src/artifact';
import type { S3ArtifactClient } from './index';

export interface AwsSdkS3ClientConfiguration{
  endpoint:string;
  region:string;
  accessKeyId:string;
  secretAccessKey:string;
  forcePathStyle?:boolean;
}
function load(){let sdk:any,presigner:any;try{sdk=require('@aws-sdk/client-s3');presigner=require('@aws-sdk/s3-request-presigner');}catch{throw new Error('S3 runtime dependencies are not installed. Install exact @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner versions before enabling S3 artifact storage.');}return{sdk,presigner};}
function bodyAsAsyncIterable(body:any):AsyncIterable<Uint8Array>{if(body&&typeof body[Symbol.asyncIterator]==='function')return body as AsyncIterable<Uint8Array>;if(body&&typeof body.transformToByteArray==='function')return(async function*(){yield new Uint8Array(await body.transformToByteArray());})();throw new Error('S3 object response body is not asynchronously readable.');}
export class AwsSdkS3ArtifactClient implements S3ArtifactClient{
  private readonly sdk:any;private readonly presigner:any;private readonly client:any;
  constructor(private readonly config:AwsSdkS3ClientConfiguration){if(!config.region.trim())throw new Error('S3 region is required.');if(!config.accessKeyId.trim()||!config.secretAccessKey.trim())throw new Error('S3 credentials must be resolved before constructing the adapter.');const loaded=load();this.sdk=loaded.sdk;this.presigner=loaded.presigner;this.client=new this.sdk.S3Client({endpoint:config.endpoint,region:config.region,forcePathStyle:config.forcePathStyle??false,credentials:{accessKeyId:config.accessKeyId,secretAccessKey:config.secretAccessKey}});}
  async putObject(input:{bucket:string;key:string;contentType:string;body:AsyncIterable<Uint8Array>;metadata?:Record<string,string>}):Promise<{etag?:string;sizeBytes:number}>{let size=0;const {Readable}=require('node:stream');const {Upload}=require('@aws-sdk/lib-storage');const stream=Readable.from((async function*(){for await(const chunk of input.body){size+=chunk.byteLength;yield Buffer.from(chunk);}})());const upload=new Upload({client:this.client,params:{Bucket:input.bucket,Key:input.key,ContentType:input.contentType,Metadata:input.metadata,Body:stream},leavePartsOnError:false,queueSize:2});const result=await upload.done();return{etag:result.ETag,sizeBytes:size};}
  async getObject(input:{bucket:string;key:string}):Promise<AsyncIterable<Uint8Array>>{const result=await this.client.send(new this.sdk.GetObjectCommand({Bucket:input.bucket,Key:input.key}));return bodyAsAsyncIterable(result.Body);}
  async headObject(input:{bucket:string;key:string}){try{const result=await this.client.send(new this.sdk.HeadObjectCommand({Bucket:input.bucket,Key:input.key}));return{contentType:String(result.ContentType??'application/octet-stream'),sizeBytes:Number(result.ContentLength??0),etag:result.ETag,lastModified:result.LastModified?new Date(result.LastModified).toISOString():undefined,metadata:result.Metadata};}catch(error:any){if(error?.$metadata?.httpStatusCode===404||error?.name==='NotFound')return undefined;throw error;}}
  async deleteObject(input:{bucket:string;key:string}):Promise<void>{await this.client.send(new this.sdk.DeleteObjectCommand({Bucket:input.bucket,Key:input.key}));}
  async presignGetObject(input:{bucket:string;key:string;expiresInSeconds:number}):Promise<ArtifactDownloadGrant>{const url=await this.presigner.getSignedUrl(this.client,new this.sdk.GetObjectCommand({Bucket:input.bucket,Key:input.key}),{expiresIn:input.expiresInSeconds});return{url,expiresAt:new Date(Date.now()+input.expiresInSeconds*1000).toISOString()};}
  async ensureBucket(bucket:string):Promise<void>{if(!bucket.trim())throw new Error('S3 bucket is required.');try{await this.client.send(new this.sdk.HeadBucketCommand({Bucket:bucket}));return;}catch(error:any){const status=error?.$metadata?.httpStatusCode;if(status!==404&&error?.name!=='NotFound'&&error?.name!=='NoSuchBucket')throw error;}const input:any={Bucket:bucket};if(this.config.region!=='us-east-1')input.CreateBucketConfiguration={LocationConstraint:this.config.region};try{await this.client.send(new this.sdk.CreateBucketCommand(input));}catch(error:any){if(!['BucketAlreadyOwnedByYou','BucketAlreadyExists'].includes(error?.name))throw error;await this.client.send(new this.sdk.HeadBucketCommand({Bucket:bucket}));}}
  async health(bucket:string):Promise<boolean>{await this.client.send(new this.sdk.HeadBucketCommand({Bucket:bucket}));return true;}
}
