<!--
File: docs/14-LLM-EVALUATION-ENGINE.md
Purpose: Documents the production-oriented provider-neutral LLM evaluation engine, multi-judge policies, telemetry, and release-gate model.
Author: Raushan Raj
-->

# LLM Evaluation Engine

The Qualyntra evaluation engine treats AI evaluation as a platform capability rather than a vendor-specific test library. The engine operates only on contracts from `packages/contracts`; external evaluators and model providers remain adapters.

## Product goals

- Evaluate text, RAG, agent/tool, conversation, safety, and custom workloads through one portable case model.
- Keep the system-under-test independent from judge providers.
- Support deterministic checks, custom business metrics, single LLM judges, and multi-judge consensus.
- Record cost, latency, token usage, and judge-call telemetry for release governance.
- Apply regression gates to pass rate, metric averages, average evaluation cost, and P95 judge latency.
- Keep DeepEval and future evaluator products optional and outside the kernel.

## Core flow

```text
EvaluationDataset
      |
EvaluationProfile
      |
EvaluationEngine
      |
+-------------------------+
| deterministic metrics   |
| custom metrics          |
| LLM judge               |
| multi-judge consensus   |
+-------------------------+
      |
Normalized MetricResult
      |
EvaluationSummary
      |
RegressionGate
```

## Multi-judge policy

`MultiJudgeMetric` accepts judge providers through `EvaluationContext`. Providers are health-checked before generation. Failed/unavailable judges are recorded, and the metric succeeds only when the configured quorum (`minSuccessfulJudges`) is met.

Supported aggregation strategies:

- `mean`: average successful judge scores.
- `median`: reduces sensitivity to an outlier judge.
- `minimum`: conservative policy where the lowest successful score controls the result.

The engine never assumes that the model under test should judge itself.

## Native metrics

The dependency-free native metric set now includes:

- exact output match;
- expected-content containment;
- significant-token overlap;
- JSON validity;
- retrieval coverage heuristic;
- groundedness lexical heuristic;
- tool set correctness;
- tool precision;
- tool recall;
- tool sequence correctness;
- custom metric callbacks;
- single LLM-as-a-judge;
- multi-judge consensus.

The groundedness and retrieval metrics are explicitly labelled heuristics; they must not be presented as semantic/factual proof. Higher-confidence evaluation should use approved LLM judges or external evaluator adapters.

## Telemetry and release gates

Every metric can attach normalized telemetry:

```text
costUsd
latencyMs
judgeCalls
inputTokens
outputTokens
```

The engine aggregates that data per case and across a dataset. A `RegressionGate` can enforce:

```text
minimum pass rate
minimum average score by metric
maximum average evaluation cost
maximum P95 evaluation latency
```

This makes AI quality, cost, and performance releasable under one policy rather than separate ad-hoc scripts.

## Extension model

Customer-specific metrics register through `EvaluationMetricRegistry`. Model providers implement `ModelProviderAdapter`. External evaluation products implement adapters under `adapters/evaluators` and normalize results back into the Qualyntra metric contract.

Core evaluation code must not import OpenAI, Anthropic, Gemini, DeepEval, or another vendor SDK.
