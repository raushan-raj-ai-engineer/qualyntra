/**
 * File: adapters/persistence/postgres/src/alert-state.ts
 * Purpose: Persists alert cooldown claims and alert records in PostgreSQL with atomic multi-replica cooldown acquisition.
 * Author: Raushan Raj
 */
import type { AlertRecord } from '../../../../packages/contracts/src/observability';
import type { TenantScope } from '../../../../packages/contracts/src/governance';
import type { AlertStateStore } from '../../../../packages/observability/src/alerts';
import type { PostgresDatabase } from './driver';
import { restoredScope,storedScope } from './scope';

function json<T>(value:unknown):T{return(typeof value==='string'?JSON.parse(value):value) as T;}
function fromRow(row:any):AlertRecord{const record=json<AlertRecord>(row.record_json);if(row.organization_id)record.scope=restoredScope(row);return record;}
export class PostgresAlertStateStore implements AlertStateStore{
  constructor(private readonly database:PostgresDatabase){}
  async lastTriggered(key:string):Promise<number|undefined>{const result=await this.database.query<any>('SELECT last_triggered_at FROM qualyntra_alert_cooldowns WHERE state_key=$1 LIMIT 1',[key]);return result.rows[0]?new Date(result.rows[0].last_triggered_at).getTime():undefined;}
  async markTriggered(key:string,at:number):Promise<void>{await this.database.query('INSERT INTO qualyntra_alert_cooldowns (state_key,last_triggered_at) VALUES ($1,$2) ON CONFLICT (state_key) DO UPDATE SET last_triggered_at=EXCLUDED.last_triggered_at',[key,new Date(at).toISOString()]);}
  async tryMarkTriggered(key:string,at:number,cooldownMs:number):Promise<boolean>{if(cooldownMs<0||!Number.isFinite(cooldownMs))throw new Error('Alert cooldown must be a non-negative finite duration.');const cutoff=new Date(at-cooldownMs).toISOString();const result=await this.database.query<any>('INSERT INTO qualyntra_alert_cooldowns (state_key,last_triggered_at) VALUES ($1,$2) ON CONFLICT (state_key) DO UPDATE SET last_triggered_at=EXCLUDED.last_triggered_at WHERE qualyntra_alert_cooldowns.last_triggered_at<=$3 RETURNING state_key',[key,new Date(at).toISOString(),cutoff]);return result.rowCount>0;}
  async append(record:AlertRecord):Promise<void>{const s=record.scope?storedScope(record.scope):undefined;await this.database.query('INSERT INTO qualyntra_alert_records (id,rule_id,organization_id,workspace_id,project_id,environment_id,triggered_at,record_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)',[record.id,record.ruleId,s?.organizationId??null,s?.workspaceId??null,s?.projectId??null,s?.environmentId??null,record.triggeredAt,JSON.stringify(record)]);}
  async list(scope?:TenantScope,limit=200):Promise<AlertRecord[]>{const safe=Math.min(Math.max(limit,1),1000);const params:unknown[]=[];const where:string[]=[];if(scope){const s=storedScope(scope);params.push(s.organizationId);where.push(`organization_id=$${params.length}`);if(s.workspaceId){params.push(s.workspaceId);where.push(`workspace_id=$${params.length}`);}if(s.projectId){params.push(s.projectId);where.push(`project_id=$${params.length}`);}if(s.environmentId){params.push(s.environmentId);where.push(`environment_id=$${params.length}`);}}params.push(safe);const result=await this.database.query<any>(`SELECT * FROM qualyntra_alert_records${where.length?` WHERE ${where.join(' AND ')}`:''} ORDER BY triggered_at DESC,id DESC LIMIT $${params.length}`,params);return result.rows.map(fromRow);}
}
