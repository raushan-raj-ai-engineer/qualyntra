<!--
File: docs/05-LLM-TESTING.md
Purpose: Documents multi-LLM, custom-provider, RAG, agent/tool, LLM-judge, DeepEval, multi-judge, telemetry, and regression-gate testing strategy.
Author: Raushan Raj
-->

# LLM / RAG / Agent Testing

LLM testing is a first-class platform domain, not a sidecar. The authoritative engine design is documented in `14-LLM-EVALUATION-ENGINE.md`.

## Provider model

`ModelProviderAdapter` remains the stable evaluation boundary. `packages/providers` adds logical model aliases, capability-aware routing, health-aware fallback, bounded retries, normalized errors, telemetry, and externally supplied cost metadata. Vendor adapters include OpenAI Responses, Azure OpenAI, Anthropic, Gemini, Amazon Bedrock, Ollama, vLLM/OpenAI-compatible endpoints, and custom enterprise providers. Credentials and physical model names are injected by configuration or a customer secret store; the protected kernel contains neither.

The **system under test** and **judge** are intentionally separate. A model can be evaluated by another approved provider, deterministic metrics, custom business rules, or a quorum of multiple judges.

## Evaluation composition

`EvaluationDataset` contains portable evaluation cases. `EvaluationProfile` combines a metric set with an optional release gate. The engine returns normalized per-case results plus a dataset summary.

## Native metrics

- Exact match.
- Expected-content containment.
- Significant-token overlap.
- JSON validity.
- Tool correctness, precision, recall, and sequence.
- Retrieval-context coverage heuristic.
- Groundedness lexical heuristic.
- Custom metric callbacks.
- Generic single LLM-as-a-judge rubric.
- Multi-judge consensus using mean, median, or minimum aggregation.

Lexical RAG metrics are intentionally described as heuristics rather than semantic proof.

## Multi-judge evaluation

`MultiJudgeMetric` uses providers supplied through `EvaluationContext`. A policy defines the aggregation strategy and the minimum number of successful judges. Unavailable judges can be tolerated when quorum remains satisfied, and failures are retained in normalized metric details.

## DeepEval

The optional bridge keeps DeepEval outside core. The bundled bridge verifies dependency presence and defines the process boundary; production teams map approved DeepEval metrics in that adapter. Qualyntra does not claim DeepEval execution unless the optional dependency and metric mapping are installed.

## Regression gates

Dataset runs can gate on:

- total pass rate;
- per-metric average score;
- maximum average evaluation cost;
- maximum P95 evaluation latency.

Metric telemetry also tracks judge calls and token usage when providers expose that data.


## Provider routing

Evaluation profiles should depend on logical aliases such as `quality-judge` rather than physical vendor model names. `RoutedModelProvider` allows any alias route to be passed directly into existing LLM judge metrics. See `15-MULTI-LLM-PROVIDERS.md`.
