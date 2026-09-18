/**
 * File: adapters/persistence/postgres/src/telemetry-store.ts
 * Purpose: Persists redacted logs, metrics, spans, and health signals in PostgreSQL with tenant-scoped correlation queries.
 * Author: Raushan Raj
 */
import type { HealthSignal,LogRecord,MetricPoint,SpanRecord,TelemetryQuery,TelemetryReader,TelemetrySink,TelemetrySnapshot } from '../../../../packages/contracts/src/observability';
import type { TenantScope } from '../../../../packages/contracts/src/governance';
import { validateScope } from '../../../../packages/governance/src/tenancy';
import { redact } from '../../../../packages/security/src/redaction';
import type { PostgresDatabase } from './driver';
import { storedScope } from './scope';

const DEFAULT_SENSITIVE_KEYS=['authorization','api-key','apikey','token','password','secret','cookie','set-cookie'];
function json<T>(value:unknown):T{return(typeof value==='string'?JSON.parse(value):value) as T;}
function sanitize<T>(value:T,keys:string[]):T{return redact(value,keys) as T;}
function assertTime(value:string,label:string):void{if(!Number.isFinite(Date.parse(value)))throw new Error(`${label} must be an ISO-compatible timestamp`);}
export class PostgresTelemetryStore implements TelemetrySink,TelemetryReader{
  private readonly sensitiveKeys:string[];
  constructor(private readonly database:PostgresDatabase,sensitiveKeys:string[]=DEFAULT_SENSITIVE_KEYS){this.sensitiveKeys=sensitiveKeys;}
  private async insert(signalType:'log'|'metric'|'span'|'health',id:string,eventAt:string,scope:TenantScope|undefined,correlationId:string|undefined,traceId:string|undefined,name:string|undefined,record:unknown):Promise<void>{const s=scope?storedScope(scope):undefined;await this.database.query('INSERT INTO qualyntra_telemetry (signal_type,id,event_at,organization_id,workspace_id,project_id,environment_id,correlation_id,trace_id,name,record_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb) ON CONFLICT (signal_type,id) DO NOTHING',[signalType,id,eventAt,s?.organizationId??null,s?.workspaceId??null,s?.projectId??null,s?.environmentId??null,correlationId??null,traceId??null,name??null,JSON.stringify(sanitize(record,this.sensitiveKeys))]);}
  async emitLog(record:LogRecord):Promise<void>{if(record.scope)validateScope(record.scope);assertTime(record.timestamp,'Log timestamp');await this.insert('log',record.id,record.timestamp,record.scope,record.correlationId,record.traceId,undefined,record);}
  async recordMetric(point:MetricPoint):Promise<void>{if(point.scope)validateScope(point.scope);if(!Number.isFinite(point.value))throw new Error('Metric value must be finite');assertTime(point.timestamp,'Metric timestamp');await this.insert('metric',point.id,point.timestamp,point.scope,point.correlationId,point.traceId,point.name,point);}
  async recordSpan(span:SpanRecord):Promise<void>{if(span.scope)validateScope(span.scope);assertTime(span.startTime,'Span startTime');assertTime(span.endTime,'Span endTime');if(Date.parse(span.endTime)<Date.parse(span.startTime))throw new Error('Span endTime must not precede startTime');await this.insert('span',span.id,span.startTime,span.scope,span.correlationId,span.traceId,span.name,span);}
  async recordHealth(signal:HealthSignal):Promise<void>{if(signal.scope)validateScope(signal.scope);assertTime(signal.timestamp,'Health timestamp');await this.insert('health',signal.id,signal.timestamp,signal.scope,signal.correlationId,undefined,undefined,signal);}
  private async signal<T>(type:'log'|'metric'|'span'|'health',query:TelemetryQuery,limit:number):Promise<T[]>{const params:unknown[]=[type];const where=['signal_type=$1'];const add=(clause:(n:number)=>string,value:unknown)=>{params.push(value);where.push(clause(params.length));};if(query.scope){validateScope(query.scope);const s=storedScope(query.scope);add(n=>`organization_id=$${n}`,s.organizationId);if(s.workspaceId)add(n=>`workspace_id=$${n}`,s.workspaceId);if(s.projectId)add(n=>`project_id=$${n}`,s.projectId);if(s.environmentId)add(n=>`environment_id=$${n}`,s.environmentId);}if(query.correlationId)add(n=>`correlation_id=$${n}`,query.correlationId);if(query.traceId)add(n=>`trace_id=$${n}`,query.traceId);if(query.name)add(n=>`name=$${n}`,query.name);if(query.from){assertTime(query.from,'Telemetry query from');add(n=>`event_at>=$${n}`,query.from);}if(query.to){assertTime(query.to,'Telemetry query to');add(n=>`event_at<=$${n}`,query.to);}params.push(limit);const result=await this.database.query<any>(`SELECT record_json FROM qualyntra_telemetry WHERE ${where.join(' AND ')} ORDER BY event_at DESC,id DESC LIMIT $${params.length}`,params);return result.rows.map((row:any)=>json<T>(row.record_json)).reverse();}
  async query(input:TelemetryQuery={}):Promise<TelemetrySnapshot>{const limit=Math.min(Math.max(input.limit??200,1),1000);const [logs,metrics,spans,health]=await Promise.all([this.signal<LogRecord>('log',input,limit),this.signal<MetricPoint>('metric',input,limit),this.signal<SpanRecord>('span',input,limit),this.signal<HealthSignal>('health',input,limit)]);return{logs,metrics,spans,health};}
}
