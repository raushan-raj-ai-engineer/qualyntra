<!--
File: docs/05-LLM-TESTING.md
Purpose: Documents multi-LLM, custom-provider, RAG, agent/tool, LLM-judge, DeepEval, multi-judge, telemetry, and regression-gate testing strategy.
Author: Raushan Raj
-->

# LLM / RAG / Agent Testing

LLM testing is a first-class platform domain, not a sidecar. The authoritative engine design is documented in `14-LLM-EVALUATION-ENGINE.md`.

## Provider model

`ModelProviderAdapter` supports multiple providers and ordered failover. `OpenAICompatibleProvider` covers endpoints that implement the chat-completions shape; `CustomModelProvider` allows internal enterprise models. Credentials come from the environment or the customer secret store.

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
