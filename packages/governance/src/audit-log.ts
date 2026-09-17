/**
 * File: packages/governance/src/audit-log.ts
 * Purpose: Provides append-only tamper-evident audit records with chained SHA-256 hashes and metadata sanitization.
 * Author: Raushan Raj
 */
import { createHash } from 'node:crypto';
import type { AuditRecord,AuditSink } from '../../contracts/src/governance';

const sensitive=/password|secret|token|authorization|api[_-]?key|credential/i;
function sanitize(value:unknown):unknown{
  if(Array.isArray(value))return value.map(sanitize);
  if(value&&typeof value==='object'){
    const out:Record<string,unknown>={};
    for(const [key,item] of Object.entries(value as Record<string,unknown>))out[key]=sensitive.test(key)?'[REDACTED]':sanitize(item);
    return out;
  }
  return value;
}
function canonical(value:unknown):string{
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
function hashRecord(record:Omit<AuditRecord,'hash'>):string{return createHash('sha256').update(canonical(record)).digest('hex');}

export class InMemoryAuditLog implements AuditSink{
  private readonly records:AuditRecord[]=[];
  async append(input:Omit<AuditRecord,'sequence'|'previousHash'|'hash'>):Promise<AuditRecord>{
    const previous=this.records.at(-1);
    const unsigned:Omit<AuditRecord,'hash'>={...input,metadata:sanitize(input.metadata) as Record<string,unknown>|undefined,sequence:this.records.length+1,previousHash:previous?.hash};
    const record:AuditRecord={...unsigned,hash:hashRecord(unsigned)};
    this.records.push(record);return structuredClone(record);
  }
  snapshot():AuditRecord[]{return structuredClone(this.records);}
  verify():boolean{
    let previousHash: string|undefined;
    for(let index=0;index<this.records.length;index++){
      const record=this.records[index]!;
      if(record.sequence!==index+1||record.previousHash!==previousHash)return false;
      const {hash,...unsigned}=record;
      if(hash!==hashRecord(unsigned))return false;
      previousHash=hash;
    }
    return true;
  }
}
