/**
 * File: packages/evaluation/src/multi-judge.ts
 * Purpose: Provides resilient multi-judge consensus evaluation with quorum and provider-neutral aggregation policies.
 * Author: Raushan Raj
 */
import type {
  EvaluationCase,
  EvaluationContext,
  EvaluationMetric,
  JudgeAggregationStrategy,
  MetricResult,
  ModelProviderAdapter,
  MultiJudgePolicy,
} from '../../contracts/src/evaluation';
import { buildJudgeRequest, parseJudgeResponse } from './judge-response';

interface SuccessfulJudgeResult {
  providerId: string;
  model: string;
  score: number;
  reason: string;
  latencyMs: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
}

function aggregate(values: number[], strategy: JudgeAggregationStrategy): number {
  if (!values.length) {
    throw new Error('Cannot aggregate an empty judge result set.');
  }

  if (strategy === 'minimum') {
    return Math.min(...values);
  }

  if (strategy === 'median') {
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    const current = sorted[middle];
    if (current === undefined) {
      throw new Error('Median aggregation failed because no middle score was available.');
    }
    if (sorted.length % 2 === 1) {
      return current;
    }
    const previous = sorted[middle - 1];
    if (previous === undefined) {
      throw new Error('Median aggregation failed because the lower score was unavailable.');
    }
    return (previous + current) / 2;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

async function evaluateJudge(
  judge: ModelProviderAdapter,
  testCase: EvaluationCase,
  rubric: string,
): Promise<SuccessfulJudgeResult> {
  const health = await judge.health();
  if (health.status === 'unavailable') {
    throw new Error(health.message ?? 'provider unavailable');
  }

  const response = await judge.generate(buildJudgeRequest(testCase, rubric));
  const parsed = parseJudgeResponse(response.content);

  return {
    providerId: judge.id,
    model: response.model,
    score: parsed.score,
    reason: parsed.reason,
    latencyMs: response.latencyMs,
    costUsd: response.costUsd ?? 0,
    inputTokens: response.inputTokens ?? 0,
    outputTokens: response.outputTokens ?? 0,
  };
}

export class MultiJudgeMetric implements EvaluationMetric {
  readonly type = 'multi-judge' as const;
  private readonly policy: MultiJudgePolicy;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly threshold: number,
    private readonly rubric: string,
    policy: Partial<MultiJudgePolicy> = {},
  ) {
    this.policy = {
      aggregation: policy.aggregation ?? 'median',
      minSuccessfulJudges: policy.minSuccessfulJudges ?? 2,
    };

    if (this.policy.minSuccessfulJudges < 1) {
      throw new Error('Multi-judge policy requires at least one successful judge.');
    }
  }

  async evaluate(testCase: EvaluationCase, context: EvaluationContext): Promise<MetricResult> {
    const judges = context.judges ?? (context.judge ? [context.judge] : []);
    if (!judges.length) {
      throw new Error(`Metric ${this.id} requires one or more judge providers.`);
    }

    const uniqueJudgeIds = new Set(judges.map((judge) => judge.id));
    if (uniqueJudgeIds.size !== judges.length) {
      throw new Error(`Metric ${this.id} requires unique judge provider ids for independent consensus.`);
    }

    const settled = await Promise.allSettled(
      judges.map((judge) => evaluateJudge(judge, testCase, this.rubric)),
    );

    const successes: SuccessfulJudgeResult[] = [];
    const failures: Array<{ providerId: string; error: string }> = [];

    settled.forEach((result, index) => {
      const providerId = judges[index]?.id ?? `judge-${index + 1}`;
      if (result.status === 'fulfilled') {
        successes.push(result.value);
      } else {
        failures.push({
          providerId,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    });

    if (successes.length < this.policy.minSuccessfulJudges) {
      throw new Error(
        `Metric ${this.id} received ${successes.length} successful judge result(s); ` +
          `${this.policy.minSuccessfulJudges} required. Failures: ${failures
            .map((failure) => `${failure.providerId}: ${failure.error}`)
            .join(' | ')}`,
      );
    }

    const score = aggregate(successes.map((result) => result.score), this.policy.aggregation);
    const totalCostUsd = successes.reduce((total, result) => total + result.costUsd, 0);
    const totalInputTokens = successes.reduce((total, result) => total + result.inputTokens, 0);
    const totalOutputTokens = successes.reduce((total, result) => total + result.outputTokens, 0);
    const maxLatencyMs = Math.max(...successes.map((result) => result.latencyMs));

    return {
      metricId: this.id,
      score,
      passed: score >= this.threshold,
      reason: `${this.policy.aggregation} consensus from ${successes.length} successful judge(s).`,
      details: {
        aggregation: this.policy.aggregation,
        successfulJudges: successes.map((result) => ({
          providerId: result.providerId,
          model: result.model,
          score: result.score,
          reason: result.reason,
        })),
        failedJudges: failures,
      },
      telemetry: {
        costUsd: totalCostUsd,
        latencyMs: maxLatencyMs,
        judgeCalls: successes.length,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
      },
    };
  }
}
