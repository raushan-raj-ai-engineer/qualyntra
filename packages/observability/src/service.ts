/**
 * File: packages/observability/src/service.ts
 * Purpose: Coordinates telemetry recording, correlation-aware queries, alert evaluation, exporters, and operational summaries.
 * Author: Raushan Raj
 */
import type { AlertReader,HealthSignal,LogRecord,MetricPoint,SpanRecord,TelemetryExporter,TelemetryQuery,TelemetryReader,TelemetrySink,TenantScope } from '../../contracts/src';
import type { AlertEngine,AlertStateStore } from './alerts';
export class ObservabilityService implements AlertReader {
  constructor(private readonly sink:TelemetrySink,private readonly reader:TelemetryReader,private readonly alerts?:AlertEngine,private readonly alertState?:AlertStateStore,private readonly exporters:TelemetryExporter[]=[]){ }
  async emitLog(record:LogRecord){await this.sink.emitLog(record);}
  async recordMetric(point:MetricPoint){await this.sink.recordMetric(point);return this.alerts?.evaluate(point)??[];}
  async recordSpan(span:SpanRecord){await this.sink.recordSpan(span);}
  async recordHealth(signal:HealthSignal){await this.sink.recordHealth(signal);}
  query(input?:TelemetryQuery){return this.reader.query(input);}
  listAlerts(scope?:TenantScope,limit?:number){return this.alertState?.list(scope,limit)??Promise.resolve([]);}
  async summary(scope?:TenantScope){const snapshot=await this.reader.query({scope,limit:1000});const alerts=await this.listAlerts(scope,100);return{counts:{logs:snapshot.logs.length,metrics:snapshot.metrics.length,spans:snapshot.spans.length,health:snapshot.health.length,alerts:alerts.length},health:{healthy:snapshot.health.filter(v=>v.status==='healthy').length,degraded:snapshot.health.filter(v=>v.status==='degraded').length,unavailable:snapshot.health.filter(v=>v.status==='unavailable').length},latestAlerts:alerts.slice(0,20)};}
  async export(input?:TelemetryQuery){const snapshot=await this.reader.query(input);for(const exporter of this.exporters)await exporter.export(snapshot);return{exporters:this.exporters.length,records:snapshot.logs.length+snapshot.metrics.length+snapshot.spans.length+snapshot.health.length};}
}
