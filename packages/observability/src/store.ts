/**
 * File: packages/observability/src/store.ts
 * Purpose: Provides a bounded tenant-aware in-memory telemetry store for local use, tests, and exporter staging.
 * Author: Raushan Raj
 */
import type { HealthSignal,LogRecord,MetricPoint,SpanRecord,TelemetryQuery,TelemetryReader,TelemetrySink,TelemetrySnapshot,TenantScope } from '../../contracts/src';
import { scopeContains,validateScope } from '../../governance/src/tenancy';
import { redact } from '../../security/src/redaction';

export interface InMemoryTelemetryStoreOptions { maxRecordsPerSignal?:number; sensitiveKeys?:string[]; }
const DEFAULT_SENSITIVE_KEYS=['authorization','api-key','apikey','token','password','secret','cookie','set-cookie'];
function bounded<T>(items:T[],value:T,max:number):void{items.push(value);if(items.length>max)items.splice(0,items.length-max);}
function inWindow(timestamp:string,query:TelemetryQuery):boolean{const time=Date.parse(timestamp);if(query.from&&time<Date.parse(query.from))return false;if(query.to&&time>Date.parse(query.to))return false;return true;}
function matchesScope(record:TenantScope|undefined,query:TenantScope|undefined):boolean{if(!query)return true;return Boolean(record&&scopeContains(query,record));}
function sanitize<T>(value:T,keys:string[]):T{return redact(value,keys) as T;}

export class InMemoryTelemetryStore implements TelemetrySink,TelemetryReader {
  private readonly logs:LogRecord[]=[];private readonly metrics:MetricPoint[]=[];private readonly spans:SpanRecord[]=[];private readonly health:HealthSignal[]=[];
  private readonly max:number;private readonly sensitiveKeys:string[];
  constructor(options:InMemoryTelemetryStoreOptions={}){this.max=options.maxRecordsPerSignal??10_000;if(!Number.isInteger(this.max)||this.max<1)throw new Error('maxRecordsPerSignal must be a positive integer');this.sensitiveKeys=options.sensitiveKeys??DEFAULT_SENSITIVE_KEYS;}
  async emitLog(record:LogRecord):Promise<void>{if(record.scope)validateScope(record.scope);bounded(this.logs,sanitize(structuredClone(record),this.sensitiveKeys),this.max);}
  async recordMetric(point:MetricPoint):Promise<void>{if(point.scope)validateScope(point.scope);if(!Number.isFinite(point.value))throw new Error('Metric value must be finite');bounded(this.metrics,sanitize(structuredClone(point),this.sensitiveKeys),this.max);}
  async recordSpan(span:SpanRecord):Promise<void>{if(span.scope)validateScope(span.scope);if(Date.parse(span.endTime)<Date.parse(span.startTime))throw new Error('Span endTime must not precede startTime');bounded(this.spans,sanitize(structuredClone(span),this.sensitiveKeys),this.max);}
  async recordHealth(signal:HealthSignal):Promise<void>{if(signal.scope)validateScope(signal.scope);bounded(this.health,sanitize(structuredClone(signal),this.sensitiveKeys),this.max);}
  async query(input:TelemetryQuery={}):Promise<TelemetrySnapshot>{if(input.scope)validateScope(input.scope);if(input.from&&Number.isNaN(Date.parse(input.from)))throw new Error('Telemetry query from must be an ISO-compatible timestamp');if(input.to&&Number.isNaN(Date.parse(input.to)))throw new Error('Telemetry query to must be an ISO-compatible timestamp');const query={...input,limit:Math.min(Math.max(input.limit??200,1),1000)};const common=(item:{scope?:TenantScope;correlationId?:string;traceId?:string;name?:string})=>matchesScope(item.scope,query.scope)&&(!query.correlationId||item.correlationId===query.correlationId)&&(!query.traceId||item.traceId===query.traceId)&&(!query.name||item.name===query.name);const regular=<T extends {timestamp:string;scope?:TenantScope;correlationId?:string;traceId?:string;name?:string}>(items:T[])=>items.filter(item=>inWindow(item.timestamp,query)&&common(item)).slice(-query.limit!);const spans=this.spans.filter(item=>inWindow(item.startTime,query)&&common(item)).slice(-query.limit!);return structuredClone({logs:regular(this.logs),metrics:regular(this.metrics),spans,health:regular(this.health)});}
}
