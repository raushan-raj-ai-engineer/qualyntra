/**
 * File: packages/contracts/src/artifact.ts
 * Purpose: Defines vendor-neutral durable artifact storage, metadata, retention, and time-limited download contracts.
 * Author: Raushan Raj
 */
import type { Adapter } from './adapter';
import type { EvidenceKind } from './evidence';
import type { TenantScope } from './governance';

export type ArtifactKind=EvidenceKind|'report'|'attachment'|'bundle';

export interface ArtifactRecord {
  id:string;
  scope:TenantScope;
  runId?:string;
  evidenceId?:string;
  kind:ArtifactKind;
  name:string;
  contentType:string;
  sizeBytes:number;
  sha256:string;
  storageAdapterId:string;
  storageKey:string;
  createdAt:string;
  retentionUntil?:string;
  metadata?:Record<string,unknown>;
}

export interface ArtifactObjectMetadata {
  key:string;
  contentType:string;
  sizeBytes:number;
  etag?:string;
  lastModified?:string;
  metadata?:Record<string,string>;
}

export interface ArtifactDownloadGrant { url:string; expiresAt:string; }

export interface ArtifactStorageAdapter extends Adapter {
  readonly descriptor:Adapter['descriptor']&{kind:'artifact-storage'};
  put(input:{key:string;contentType:string;body:AsyncIterable<Uint8Array>;metadata?:Record<string,string>}):Promise<ArtifactObjectMetadata>;
  get(key:string):Promise<AsyncIterable<Uint8Array>>;
  head(key:string):Promise<ArtifactObjectMetadata|undefined>;
  delete(key:string):Promise<void>;
  createDownloadGrant?(input:{key:string;expiresInSeconds:number}):Promise<ArtifactDownloadGrant>;
}

export interface ArtifactCatalog {
  save(record:ArtifactRecord):Promise<ArtifactRecord>;
  get(scope:TenantScope,id:string):Promise<ArtifactRecord|undefined>;
  list(scope:TenantScope,input:{offset:number;limit:number;runId?:string}):Promise<{items:ArtifactRecord[];offset:number;limit:number;total:number}>;
  listExpired(now:string,limit:number):Promise<ArtifactRecord[]>;
  delete(scope:TenantScope,id:string):Promise<void>;
}
