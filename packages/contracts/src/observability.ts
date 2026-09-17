/**
 * File: packages/contracts/src/observability.ts
 * Purpose: Defines vendor-neutral telemetry, correlation, health, alert, and exporter contracts.
 * Author: Raushan Raj
 */
import type { TenantScope } from './governance';

export type TelemetrySeverity='debug'|'info'|'warn'|'error'|'fatal';
export type MetricKind='counter'|'gauge'|'histogram';
export type SpanStatus='unset'|'ok'|'error';
export interface TelemetryResource { serviceName:string; serviceVersion?:string; instanceId?:string; attributes?:Record<string,string|number|boolean>; }
export interface TelemetryContext { correlationId?:string; traceId?:string; spanId?:string; scope?:TenantScope; actorId?:string; }
export interface LogRecord extends TelemetryContext { id:string; timestamp:string; severity:TelemetrySeverity; message:string; resource:TelemetryResource; attributes?:Record<string,unknown>; }
export interface MetricExemplar { value:number; timestamp:string; traceId?:string; spanId?:string; correlationId?:string; }
export interface MetricPoint extends TelemetryContext { id:string; timestamp:string; name:string; kind:MetricKind; value:number; unit?:string; resource:TelemetryResource; attributes?:Record<string,string|number|boolean>; exemplars?:MetricExemplar[]; }
export interface SpanEvent { name:string; timestamp:string; attributes?:Record<string,unknown>; }
export interface SpanRecord extends TelemetryContext { id:string; traceId:string; spanId:string; parentSpanId?:string; name:string; startTime:string; endTime:string; status:SpanStatus; resource:TelemetryResource; attributes?:Record<string,unknown>; events?:SpanEvent[]; }
export interface HealthSignal { id:string; timestamp:string; component:string; status:'healthy'|'degraded'|'unavailable'; scope?:TenantScope; correlationId?:string; message?:string; attributes?:Record<string,unknown>; }
export interface TelemetryQuery { scope?:TenantScope; correlationId?:string; traceId?:string; name?:string; from?:string; to?:string; limit?:number; }
export interface TelemetrySnapshot { logs:LogRecord[]; metrics:MetricPoint[]; spans:SpanRecord[]; health:HealthSignal[]; }
export interface TelemetrySink { emitLog(record:LogRecord):Promise<void>; recordMetric(point:MetricPoint):Promise<void>; recordSpan(span:SpanRecord):Promise<void>; recordHealth(signal:HealthSignal):Promise<void>; }
export interface TelemetryReader { query(input?:TelemetryQuery):Promise<TelemetrySnapshot>; }
export interface TelemetryExporter { readonly id:string; export(snapshot:TelemetrySnapshot):Promise<void>; }

export type AlertSeverity='info'|'warning'|'critical';
export type AlertOperator='gt'|'gte'|'lt'|'lte'|'eq'|'neq';
export interface AlertRule { id:string; name:string; metric:string; operator:AlertOperator; threshold:number; severity:AlertSeverity; cooldownSeconds:number; notificationAdapterIds:string[]; scope?:TenantScope; enabled?:boolean; }
export interface AlertRecord { id:string; ruleId:string; ruleName:string; metric:string; observedValue:number; threshold:number; severity:AlertSeverity; triggeredAt:string; scope?:TenantScope; correlationId?:string; status:'triggered'|'notified'|'notification_failed'|'acknowledged'; notificationResults?:Record<string,'sent'|'failed'>; }
export interface AlertReader { listAlerts(scope?:TenantScope,limit?:number):Promise<AlertRecord[]>; }
