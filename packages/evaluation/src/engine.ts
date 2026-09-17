/**
 * File: packages/evaluation/src/engine.ts
 * Purpose: Executes evaluation metrics, aggregates telemetry, summarizes datasets, and applies release regression gates.
 * Author: Raushan Raj
 */
import type {
  EvaluationCase,
  EvaluationContext,
  EvaluationDataset,
  EvaluationMetric,
  EvaluationProfile,
  EvaluationRunResult,
  EvaluationRunTelemetry,
  EvaluationSummary,
  ProfileEvaluationResult,
  RegressionGate,
  RegressionGateResult,
} from '../../contracts/src/evaluation';

function percentile95(values: number[]): number {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(sorted.length * 0.95) - 1);
  return sorted[index] ?? 0;
}

function aggregateTelemetry(metrics: EvaluationRunResult['metrics']): EvaluationRunTelemetry {
  const latencyValues = metrics
    .map((metric) => metric.telemetry?.latencyMs ?? 0)
    .filter((latency) => latency > 0);

  return {
    totalCostUsd: metrics.reduce((total, metric) => total + (metric.telemetry?.costUsd ?? 0), 0),
    totalLatencyMs: latencyValues.reduce((total, latency) => total + latency, 0),
    maxMetricLatencyMs: latencyValues.length ? Math.max(...latencyValues) : 0,
    judgeCalls: metrics.reduce((total, metric) => total + (metric.telemetry?.judgeCalls ?? 0), 0),
    inputTokens: metrics.reduce((total, metric) => total + (metric.telemetry?.inputTokens ?? 0), 0),
    outputTokens: metrics.reduce((total, metric) => total + (metric.telemetry?.outputTokens ?? 0), 0),
  };
}

export class EvaluationEngine {
  async evaluate(
    testCase: EvaluationCase,
    metrics: EvaluationMetric[],
    context: EvaluationContext = {},
  ): Promise<EvaluationRunResult> {
    const results = [];

    for (const metric of metrics) {
      results.push(await metric.evaluate(testCase, context));
    }

    return {
      caseId: testCase.id,
      passed: results.every((result) => result.passed),
      metrics: results,
      telemetry: aggregateTelemetry(results),
      createdAt: new Date().toISOString(),
    };
  }

  async evaluateDataset(
    datasetOrCases: EvaluationDataset | EvaluationCase[],
    metrics: EvaluationMetric[],
    context: EvaluationContext = {},
  ): Promise<EvaluationRunResult[]> {
    const cases = Array.isArray(datasetOrCases) ? datasetOrCases : datasetOrCases.cases;
    const output: EvaluationRunResult[] = [];

    for (const testCase of cases) {
      output.push(await this.evaluate(testCase, metrics, context));
    }

    return output;
  }

  summarize(results: EvaluationRunResult[]): EvaluationSummary {
    const metricScores = new Map<string, number[]>();

    for (const result of results) {
      for (const metric of result.metrics) {
        const scores = metricScores.get(metric.metricId) ?? [];
        scores.push(metric.score);
        metricScores.set(metric.metricId, scores);
      }
    }

    const metricAverages: Record<string, number> = {};
    for (const [metricId, scores] of metricScores.entries()) {
      metricAverages[metricId] = scores.reduce((total, score) => total + score, 0) / scores.length;
    }

    const passedCases = results.filter((result) => result.passed).length;
    const totalCostUsd = results.reduce((total, result) => total + result.telemetry.totalCostUsd, 0);
    const latencies = results
      .map((result) => result.telemetry.totalLatencyMs)
      .filter((latency) => latency > 0);

    return {
      totalCases: results.length,
      passedCases,
      failedCases: results.length - passedCases,
      passRate: results.length ? passedCases / results.length : 0,
      metricAverages,
      totalCostUsd,
      averageCostUsd: results.length ? totalCostUsd / results.length : 0,
      p95LatencyMs: percentile95(latencies),
      totalJudgeCalls: results.reduce((total, result) => total + result.telemetry.judgeCalls, 0),
      totalInputTokens: results.reduce((total, result) => total + result.telemetry.inputTokens, 0),
      totalOutputTokens: results.reduce((total, result) => total + result.telemetry.outputTokens, 0),
    };
  }

  gate(results: EvaluationRunResult[], gate: RegressionGate): RegressionGateResult {
    const summary = this.summarize(results);
    const reasons: string[] = [];

    if (!results.length) {
      reasons.push('No evaluation results were supplied to the regression gate.');
    }

    if (summary.passRate < gate.minPassRate) {
      reasons.push(
        `Pass rate ${summary.passRate.toFixed(4)} below ${gate.minPassRate.toFixed(4)}`,
      );
    }

    for (const [metricId, minimum] of Object.entries(gate.requiredMetrics ?? {})) {
      const average = summary.metricAverages[metricId] ?? 0;
      if (average < minimum) {
        reasons.push(`Metric ${metricId} average ${average.toFixed(4)} below ${minimum.toFixed(4)}`);
      }
    }

    if (
      gate.maxAverageCostUsd !== undefined &&
      summary.averageCostUsd > gate.maxAverageCostUsd
    ) {
      reasons.push(
        `Average evaluation cost ${summary.averageCostUsd.toFixed(6)} exceeds ${gate.maxAverageCostUsd.toFixed(6)}`,
      );
    }

    if (gate.maxP95LatencyMs !== undefined && summary.p95LatencyMs > gate.maxP95LatencyMs) {
      reasons.push(
        `P95 evaluation latency ${summary.p95LatencyMs.toFixed(2)}ms exceeds ${gate.maxP95LatencyMs.toFixed(2)}ms`,
      );
    }

    return {
      gateId: gate.id,
      passed: reasons.length === 0,
      passRate: summary.passRate,
      reasons,
      summary,
    };
  }

  async evaluateProfile(
    dataset: EvaluationDataset,
    profile: EvaluationProfile,
    context: EvaluationContext = {},
  ): Promise<ProfileEvaluationResult> {
    const results = await this.evaluateDataset(dataset, profile.metrics, context);
    const summary = this.summarize(results);
    const gate = profile.gate ? this.gate(results, profile.gate) : undefined;

    return {
      profileId: profile.id,
      datasetId: dataset.id,
      results,
      summary,
      gate,
    };
  }
}
