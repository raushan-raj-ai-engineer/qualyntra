/**
 * File: packages/evaluation/src/metric-registry.ts
 * Purpose: Registers evaluation metrics by stable identifier so product and customer-defined metrics can be composed without editing the engine.
 * Author: Raushan Raj
 */
import type { EvaluationMetric } from '../../contracts/src/evaluation';

export class EvaluationMetricRegistry {
  private readonly metrics = new Map<string, EvaluationMetric>();

  register(metric: EvaluationMetric): void {
    if (this.metrics.has(metric.id)) {
      throw new Error(`Evaluation metric already registered: ${metric.id}`);
    }
    this.metrics.set(metric.id, metric);
  }

  get(id: string): EvaluationMetric {
    const metric = this.metrics.get(id);
    if (!metric) {
      throw new Error(`Evaluation metric not registered: ${id}`);
    }
    return metric;
  }

  list(): EvaluationMetric[] {
    return [...this.metrics.values()];
  }
}
