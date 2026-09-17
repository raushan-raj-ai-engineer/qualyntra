/**
 * File: adapters/persistence/postgres/src/audit-log.ts
 * Purpose: Persists sanitized tamper-evident audit records in PostgreSQL with serialized transactional hash-chain updates.
 * Author: Raushan Raj
 */
import type { AuditReader,AuditRecord,AuditSink,TenantScope } from '../../../../packages/contracts/src/governance';
import { hashAuditRecord,sanitizeAuditValue,verifyAuditChain } from '../../../../packages/governance/src/audit-chain';
import type { PostgresDatabase } from './driver';
import { restoredScope,scopeParams,storedScope } from './scope';
function fromRow(row:any):AuditRecord{return{id:String(row.id),sequence:Number(row.sequence),timestamp:new Date(row.timestamp).toISOString(),actorId:String(row.actor_id),action:String(row.action),resource:String(row.resource),outcome:row.outcome,correlationId:row.correlation_id??undefined,scope:row.organization_id?restoredScope(row):undefined,metadata:row.metadata_json?typeof row.metadata_json==='string'?JSON.parse(row.metadata_json):row.metadata_json:undefined,previousHash:row.previous_hash??undefined,hash:String(row.hash)};}
export class PostgresAuditLog implements AuditSink,AuditReader{
  constructor(private readonly database:PostgresDatabase){}
  async append(input:Omit<AuditRecord,'sequence'|'previousHash'|'hash'>):Promise<AuditRecord>{return this.database.transaction(async tx=>{await tx.query('SELECT pg_advisory_xact_lock($1)',[73915032]);const previous=await tx.query<any>('SELECT sequence,hash FROM qualyntra_audit_records ORDER BY sequence DESC LIMIT 1');const prior=previous.rows[0];const sequence=Number(prior?.sequence??0)+1;const previousHash=prior?.hash?String(prior.hash):undefined;const unsigned:Omit<AuditRecord,'hash'>={...input,metadata:sanitizeAuditValue(input.metadata) as Record<string,unknown>|undefined,sequence,previousHash};const record:AuditRecord={...unsigned,hash:hashAuditRecord(unsigned)};const s=input.scope?storedScope(input.scope):undefined;await tx.query('INSERT INTO qualyntra_audit_records (id,sequence,timestamp,actor_id,action,resource,outcome,correlation_id,organization_id,workspace_id,project_id,environment_id,metadata_json,previous_hash,hash) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15)',[record.id,record.sequence,record.timestamp,record.actorId,record.action,record.resource,record.outcome,record.correlationId??null,s?.organizationId??null,s?.workspaceId??null,s?.projectId??null,s?.environmentId??null,JSON.stringify(record.metadata??{}),record.previousHash??null,record.hash]);return record;});}
  async list(scope?:TenantScope):Promise<AuditRecord[]>{if(!scope){const result=await this.database.query<any>('SELECT * FROM qualyntra_audit_records ORDER BY sequence');return result.rows.map(fromRow);}const scoped=scopeParams(scope);const result=await this.database.query<any>(`SELECT * FROM qualyntra_audit_records WHERE ${scoped.sql} ORDER BY sequence`,scoped.params);return result.rows.map(fromRow);}
  async verify():Promise<boolean>{return verifyAuditChain(await this.list());}
}
