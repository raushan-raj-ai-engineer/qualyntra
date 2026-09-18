/**
 * File: apps/control-plane/src/artifact-backend.ts
 * Purpose: Composes local or shared S3-compatible artifact-object storage for the control plane without exposing credentials to platform contracts.
 * Author: Raushan Raj
 */
import path from 'node:path';
import type { ArtifactStorageAdapter } from '../../../packages/contracts/src/artifact';
import type { NetworkPolicy } from '../../../packages/contracts/src/configuration';
import { readSecretFile } from '../../../packages/security/src/file-secret';
import { LocalArtifactStorageAdapter } from '../../../adapters/storage/local/src';
import { S3ArtifactStorageAdapter } from '../../../adapters/storage/s3/src';
import { AwsSdkS3ArtifactClient } from '../../../adapters/storage/s3/src/aws-sdk-client';

export type ArtifactBackendMode='local'|'s3';
export interface ArtifactBackendInput{dataDir:string;networkPolicy:NetworkPolicy;env?:Record<string,string|undefined>;}
function bool(value:string|undefined,fallback:boolean):boolean{if(value===undefined)return fallback;return['1','true','yes','on'].includes(value.toLowerCase());}
function required(env:Record<string,string|undefined>,key:string):string{const value=env[key]?.trim();if(!value)throw new Error(`${key} is required when S3 artifact storage is enabled.`);return value;}
export async function createControlPlaneArtifactStorage(input:ArtifactBackendInput):Promise<{mode:ArtifactBackendMode;adapter:ArtifactStorageAdapter}>{const env=input.env??process.env;const mode=(env.QUALYNTRA_ARTIFACT_STORAGE_BACKEND??'local').trim().toLowerCase();if(mode==='local')return{mode:'local',adapter:new LocalArtifactStorageAdapter(path.join(input.dataDir,'artifacts'))};if(mode!=='s3')throw new Error('QUALYNTRA_ARTIFACT_STORAGE_BACKEND must be local or s3.');const endpoint=required(env,'QUALYNTRA_S3_ENDPOINT');const bucket=required(env,'QUALYNTRA_S3_BUCKET');const region=required(env,'QUALYNTRA_S3_REGION');const accessKeyId=await readSecretFile(required(env,'QUALYNTRA_S3_ACCESS_KEY_FILE'));const secretAccessKey=await readSecretFile(required(env,'QUALYNTRA_S3_SECRET_KEY_FILE'));const client=new AwsSdkS3ArtifactClient({endpoint,region,accessKeyId,secretAccessKey,forcePathStyle:bool(env.QUALYNTRA_S3_FORCE_PATH_STYLE,false)});if(bool(env.QUALYNTRA_S3_ENSURE_BUCKET,false))await client.ensureBucket(bucket);return{mode:'s3',adapter:new S3ArtifactStorageAdapter({endpoint,bucket,networkPolicy:input.networkPolicy,allowInsecureLocalhost:bool(env.QUALYNTRA_S3_ALLOW_INSECURE_LOCALHOST,false)},client)};}
