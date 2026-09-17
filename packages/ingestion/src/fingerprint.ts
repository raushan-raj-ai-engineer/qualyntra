/**
 * File: packages/ingestion/src/fingerprint.ts
 * Purpose: Produces deterministic privacy-safe fingerprints for normalized external results and optional duplicate suppression.
 * Author: Raushan Raj
 */
import { createHash } from 'node:crypto';
import type { UniversalTestResult } from '../../contracts/src/result';

export function resultFingerprint(result:UniversalTestResult):string {
  const stable=JSON.stringify({suite:result.suite??'',name:result.name,status:result.status,durationMs:result.durationMs,failure:{category:result.failure?.category??'',message:result.failure?.message??''},tags:[...(result.tags??[])].sort()});
  return createHash('sha256').update(stable).digest('hex');
}
