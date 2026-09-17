/**
 * File: packages/ingestion/src/types.ts
 * Purpose: Defines vendor-neutral contracts for safely ingesting external test-result artifacts into Qualyntra.
 * Author: Raushan Raj
 */
import type { ResultAdapter, UniversalTestResult } from '../../contracts/src/result';
import type { RuntimeIdentity } from '../../contracts/src/execution';

export type ResultFormat='junit-xml'|'trx'|'allure-json'|'cucumber-json'|'robot-xml'|string;

export interface ResultAdapterRegistration {
  format: ResultFormat;
  adapter: ResultAdapter;
  priority?: number;
  detect?: (input:{path?:string;contentType?:string;content:string})=>boolean;
}

export interface ResultIngestionLimits {
  maxBytes:number;
  maxResults:number;
  failOnEmpty:boolean;
}

export interface ResultIngestionRequest {
  runId:string;
  runtime:RuntimeIdentity;
  path?:string;
  content?:string;
  contentType?:string;
  format?:ResultFormat;
  allowedRoot?:string;
  limits?:Partial<ResultIngestionLimits>;
  deduplicate?:boolean;
}

export interface ResultIngestionSummary {
  format:ResultFormat;
  sourceName?:string;
  total:number;
  passed:number;
  failed:number;
  skipped:number;
  error:number;
  duplicateCount:number;
}

export interface ResultIngestionOutcome {
  results:UniversalTestResult[];
  summary:ResultIngestionSummary;
}
