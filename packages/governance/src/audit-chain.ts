/**
 * File: packages/governance/src/audit-chain.ts
 * Purpose: Provides canonical audit-record sanitization and hashing shared by in-memory and durable audit sinks.
 * Author: Raushan Raj
 */
import { createHash } from 'node:crypto';
import type { AuditRecord } from '../../contracts/src/governance';
const sensitive=/password|secret|token|authorization|api[_-]?key|credential/i;
export function sanitizeAuditValue(value:unknown):unknown{
  if(Array.isArray(value))return value.map(sanitizeAuditValue);
  if(value&&typeof value==='object'){const out:Record<string,unknown>={};for(const [key,item] of Object.entries(value as Record<string,unknown>))out[key]=sensitive.test(key)?'[REDACTED]':sanitizeAuditValue(item);return out;}
  return value;
}
export function canonicalAuditValue(value:unknown):string{
  if(Array.isArray(value))return `[${value.map(canonicalAuditValue).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.entries(value as Record<string,unknown>).filter(([,item])=>item!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonicalAuditValue(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
export function hashAuditRecord(record:Omit<AuditRecord,'hash'>):string{return createHash('sha256').update(canonicalAuditValue(record)).digest('hex');}
export function verifyAuditChain(records:AuditRecord[]):boolean{let previousHash:string|undefined;for(let index=0;index<records.length;index++){const record=records[index]!;if(record.sequence!==index+1||record.previousHash!==previousHash)return false;const{hash,...unsigned}=record;if(hash!==hashAuditRecord(unsigned))return false;previousHash=hash;}return true;}
