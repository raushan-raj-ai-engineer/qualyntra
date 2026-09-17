/**
 * File: tests/evaluation/advanced-evaluation.test.ts
 * Purpose: Verifies advanced native metrics, multi-judge quorum, dataset summaries, and cost/latency regression gates.
 * Author: Raushan Raj
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { EvaluationMetric, ModelProviderAdapter, ModelRequest, ModelResponse } from '../../packages/contracts/src/evaluation';
import { EvaluationEngine } from '../../packages/evaluation/src/engine';
import { EvaluationMetricRegistry } from '../../packages/evaluation/src/metric-registry';
import {
  GroundednessHeuristicMetric,
  JsonValidityMetric,
  TokenOverlapMetric,
  ToolPrecisionMetric,
  ToolRecallMetric,
  ToolSequenceMetric,
} from '../../packages/evaluation/src/metrics';
import { MultiJudgeMetric } from '../../packages/evaluation/src/multi-judge';
import { parseJudgeResponse } from '../../packages/evaluation/src/judge-response';

class JudgeProvider implements ModelProviderAdapter {
  constructor(
    public readonly id: string,
    private readonly score: number,
    private readonly latencyMs: number,
    private readonly costUsd: number,
    private readonly available = true,
  ) {}

  capabilities() {
    return {
      chat: true,
      streaming: false,
      embeddings: false,
      jsonMode: true,
      tools: false,
      multimodal: false,
    };
  }

  async health() {
    return this.available
      ? { status: 'healthy' as const }
      : { status: 'unavailable' as const, message: 'offline for test' };
  }

  async generate(_request: ModelRequest): Promise<ModelResponse> {
    if (!this.available) {
      throw new Error('offline for test');
    }
    return {
      content: `\`\`\`json\n{"score":${this.score},"reason":"judge ${this.id}"}\n\`\`\``,
      model: `${this.id}-model`,
      provider: this.id,
      latencyMs: this.latencyMs,
      costUsd: this.costUsd,
      inputTokens: 10,
      outputTokens: 5,
    };
  }
}

test('judge parser accepts fenced JSON and clamps score', () => {
  const parsed = parseJudgeResponse('```json\n{"score":1.4,"reason":"strong"}\n```');
  assert.equal(parsed.score, 1);
  assert.equal(parsed.reason, 'strong');
});

test('advanced deterministic metrics cover RAG, tools, JSON, and text overlap', async () => {
  const testCase = {
    id: 'advanced-1',
    kind: 'rag' as const,
    input: 'Find customer status',
    actualOutput: '{"status":"active customer"}',
    expectedOutput: 'active customer',
    context: ['customer status is active'],
    retrievalContext: ['customer status is active'],
    toolsExpected: ['search', 'lookup'],
    toolsUsed: ['search', 'lookup'],
  };

  const metrics: EvaluationMetric[] = [
    new TokenOverlapMetric(0.2),
    new GroundednessHeuristicMetric(0.2),
    new ToolPrecisionMetric(),
    new ToolRecallMetric(),
    new ToolSequenceMetric(),
    new JsonValidityMetric(),
  ];

  for (const metric of metrics) {
    const result = await metric.evaluate(testCase, {});
    assert.equal(result.passed, true, `${metric.id} should pass`);
  }
});

test('multi-judge metric uses quorum and median consensus while tolerating one unavailable judge', async () => {
  const metric = new MultiJudgeMetric('quality-consensus', 'Quality Consensus', 0.8, 'Be correct', {
    aggregation: 'median',
    minSuccessfulJudges: 2,
  });

  const result = await metric.evaluate(
    { id: 'judge-1', input: 'q', actualOutput: 'a' },
    {
      judges: [
        new JudgeProvider('judge-a', 0.9, 40, 0.01),
        new JudgeProvider('judge-b', 0.8, 70, 0.02),
        new JudgeProvider('judge-c', 0.1, 10, 0, false),
      ],
    },
  );

  assert.equal(result.passed, true);
  assert.ok(Math.abs(result.score - 0.85) < 1e-12);
  assert.equal(result.telemetry?.judgeCalls, 2);
  assert.equal(result.telemetry?.costUsd, 0.03);
  assert.equal(result.telemetry?.latencyMs, 70);
});

test('evaluation engine summarizes telemetry and enforces cost and latency gates', async () => {
  const engine = new EvaluationEngine();
  const metric = new MultiJudgeMetric('quality', 'Quality', 0.8, 'Be correct', {
    aggregation: 'mean',
    minSuccessfulJudges: 2,
  });
  const judges = [
    new JudgeProvider('judge-a', 0.9, 100, 0.02),
    new JudgeProvider('judge-b', 0.9, 200, 0.03),
  ];

  const results = await engine.evaluateDataset(
    {
      id: 'dataset-1',
      cases: [
        { id: '1', input: 'q1', actualOutput: 'a1' },
        { id: '2', input: 'q2', actualOutput: 'a2' },
      ],
    },
    [metric],
    { judges },
  );

  const summary = engine.summarize(results);
  assert.equal(summary.passRate, 1);
  assert.equal(summary.totalJudgeCalls, 4);
  assert.equal(summary.totalCostUsd, 0.1);
  assert.equal(summary.averageCostUsd, 0.05);
  assert.equal(summary.p95LatencyMs, 200);

  const gate = engine.gate(results, {
    id: 'release-gate',
    minPassRate: 1,
    requiredMetrics: { quality: 0.85 },
    maxAverageCostUsd: 0.04,
    maxP95LatencyMs: 150,
  });

  assert.equal(gate.passed, false);
  assert.equal(gate.reasons.length, 2);
});

test('metric registry rejects duplicates and resolves custom metric implementations by id', () => {
  const registry = new EvaluationMetricRegistry();
  const metric = new JsonValidityMetric();
  registry.register(metric);
  assert.equal(registry.get(metric.id), metric);
  assert.throws(() => registry.register(metric), /already registered/);
});


test('multi-judge metric rejects duplicate provider ids as non-independent consensus', async () => {
  const metric = new MultiJudgeMetric('duplicate-guard', 'Duplicate Guard', 0.5, 'Be correct', {
    minSuccessfulJudges: 2,
  });
  const judge = new JudgeProvider('same-judge', 0.9, 10, 0);

  await assert.rejects(
    () => metric.evaluate({ id: 'duplicate', input: 'q', actualOutput: 'a' }, { judges: [judge, judge] }),
    /unique judge provider ids/,
  );
});

test('regression gate never silently passes an empty evaluation result set', () => {
  const engine = new EvaluationEngine();
  const gate = engine.gate([], { id: 'empty-gate', minPassRate: 0 });

  assert.equal(gate.passed, false);
  assert.match(gate.reasons[0] ?? '', /No evaluation results/);
});
