/**
 * File: packages/evaluation/src/llm-judge.ts
 * Purpose: Implements a configurable LLM-as-a-judge metric using a provider supplied at runtime rather than a fixed model.
 * Author: Raushan Raj
 */
import type {
  EvaluationCase,
  EvaluationContext,
  EvaluationMetric,
  MetricResult,
} from '../../contracts/src/evaluation';
import { buildJudgeRequest, parseJudgeResponse } from './judge-response';

export class LlmJudgeMetric implements EvaluationMetric {
  readonly type = 'llm-judge' as const;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly threshold: number,
    private readonly rubric: string,
  ) {}

  async evaluate(testCase: EvaluationCase, context: EvaluationContext): Promise<MetricResult> {
    if (!context.judge) {
      throw new Error(`Metric ${this.id} requires an evaluation judge provider.`);
    }

    const response = await context.judge.generate(buildJudgeRequest(testCase, this.rubric));
    const parsed = parseJudgeResponse(response.content);

    return {
      metricId: this.id,
      score: parsed.score,
      passed: parsed.score >= this.threshold,
      reason: parsed.reason,
      details: {
        judgeProvider: context.judge.id,
        judgeModel: response.model,
      },
      telemetry: {
        latencyMs: response.latencyMs,
        costUsd: response.costUsd ?? 0,
        judgeCalls: 1,
        inputTokens: response.inputTokens ?? 0,
        outputTokens: response.outputTokens ?? 0,
      },
    };
  }
}
