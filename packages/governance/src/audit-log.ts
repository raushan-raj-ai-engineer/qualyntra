/**
 * File: packages/governance/src/audit-log.ts
 * Purpose: Provides an in-memory append-only tamper-evident audit sink/reader for local use and tests.
 * Author: Raushan Raj
 */
import type { AuditReader,AuditRecord,AuditSink,TenantScope } from '../../contracts/src/governance';
import { scopeContains } from './tenancy';
import { hashAuditRecord,sanitizeAuditValue,verifyAuditChain } from './audit-chain';
export class InMemoryAuditLog implements AuditSink,AuditReader{
  private readonly records:AuditRecord[]=[];
  async append(input:Omit<AuditRecord,'sequence'|'previousHash'|'hash'>):Promise<AuditRecord>{const previous=this.records.at(-1);const unsigned:Omit<AuditRecord,'hash'>={...input,metadata:sanitizeAuditValue(input.metadata) as Record<string,unknown>|undefined,sequence:this.records.length+1,previousHash:previous?.hash};const record:AuditRecord={...unsigned,hash:hashAuditRecord(unsigned)};this.records.push(record);return structuredClone(record);}
  async list(scope?:TenantScope):Promise<AuditRecord[]>{const values=scope?this.records.filter(record=>record.scope&&scopeContains(scope,record.scope)):this.records;return structuredClone(values);}
  snapshot():AuditRecord[]{return structuredClone(this.records);}
  verify():boolean{return verifyAuditChain(this.records);}
}
