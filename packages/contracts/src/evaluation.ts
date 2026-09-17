/**
 * File: packages/contracts/src/evaluation.ts
 * Purpose: Defines vendor-neutral model-provider, dataset, metric, judge, telemetry, profile, and regression-gate contracts.
 * Author: Raushan Raj
 */
export type ModelRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ModelMessage {
  role: ModelRole;
  content: string;
  name?: string;
}

export interface ModelRequest {
  messages: ModelMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
}

export interface ModelResponse {
  content: string;
  model: string;
  provider: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
  raw?: unknown;
  totalTokens?: number;
  requestId?: string;
  retryCount?: number;
  fallbackUsed?: boolean;
}

export interface ModelProviderCapabilities {
  chat: boolean;
  streaming: boolean;
  embeddings: boolean;
  jsonMode: boolean;
  tools: boolean;
  multimodal: boolean;
}

export type ProviderHealthStatus = 'healthy' | 'degraded' | 'unavailable';

export interface ProviderHealth {
  status: ProviderHealthStatus;
  message?: string;
  latencyMs?: number;
  checkedAt?: string;
}


export interface ModelProviderAdapter {
  readonly id: string;
  capabilities(): ModelProviderCapabilities;
  generate(request: ModelRequest): Promise<ModelResponse>;
  health(): Promise<ProviderHealth>;
}

export type MetricType = 'deterministic' | 'llm-judge' | 'multi-judge' | 'custom';
export type EvaluationCaseKind = 'text' | 'rag' | 'agent' | 'tool' | 'conversation' | 'safety' | 'custom';

export interface EvaluationCase {
  id: string;
  kind?: EvaluationCaseKind;
  input: string;
  actualOutput: string;
  expectedOutput?: string;
  context?: string[];
  retrievalContext?: string[];
  toolsExpected?: string[];
  toolsUsed?: string[];
  metadata?: Record<string, unknown>;
}

export interface EvaluationDataset {
  id: string;
  name?: string;
  version?: string;
  cases: EvaluationCase[];
  metadata?: Record<string, unknown>;
}

export interface MetricTelemetry {
  costUsd?: number;
  latencyMs?: number;
  judgeCalls?: number;
  inputTokens?: number;
  outputTokens?: number;
}

export interface MetricResult {
  metricId: string;
  score: number;
  passed: boolean;
  reason: string;
  details?: Record<string, unknown>;
  telemetry?: MetricTelemetry;
}

export interface EvaluationContext {
  judge?: ModelProviderAdapter;
  judges?: ModelProviderAdapter[];
  variables?: Record<string, unknown>;
}

export interface EvaluationMetric {
  readonly id: string;
  readonly name: string;
  readonly type: MetricType;
  readonly threshold: number;
  evaluate(testCase: EvaluationCase, context: EvaluationContext): Promise<MetricResult>;
}

export interface EvaluationRunTelemetry {
  totalCostUsd: number;
  totalLatencyMs: number;
  maxMetricLatencyMs: number;
  judgeCalls: number;
  inputTokens: number;
  outputTokens: number;
}

export interface EvaluationRunResult {
  caseId: string;
  passed: boolean;
  metrics: MetricResult[];
  telemetry: EvaluationRunTelemetry;
  createdAt: string;
}

export interface EvaluationSummary {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  passRate: number;
  metricAverages: Record<string, number>;
  totalCostUsd: number;
  averageCostUsd: number;
  p95LatencyMs: number;
  totalJudgeCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface RegressionGate {
  id: string;
  minPassRate: number;
  requiredMetrics?: Record<string, number>;
  maxAverageCostUsd?: number;
  maxP95LatencyMs?: number;
}

export interface RegressionGateResult {
  gateId: string;
  passed: boolean;
  passRate: number;
  reasons: string[];
  summary: EvaluationSummary;
}

export interface EvaluationProfile {
  id: string;
  name?: string;
  metrics: EvaluationMetric[];
  gate?: RegressionGate;
  metadata?: Record<string, unknown>;
}

export interface ProfileEvaluationResult {
  profileId: string;
  datasetId: string;
  results: EvaluationRunResult[];
  summary: EvaluationSummary;
  gate?: RegressionGateResult;
}

export type JudgeAggregationStrategy = 'mean' | 'median' | 'minimum';

export interface MultiJudgePolicy {
  aggregation: JudgeAggregationStrategy;
  minSuccessfulJudges: number;
}
