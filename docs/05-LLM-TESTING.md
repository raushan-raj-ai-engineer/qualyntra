<!--
File: docs/05-LLM-TESTING.md
Purpose: Documents multi-LLM, custom-provider, RAG, agent/tool, LLM-judge, DeepEval, and regression-gate testing strategy.
Author: Raushan Raj
-->

# LLM / RAG / Agent Testing

LLM testing is a first-class platform domain, not a sidecar.

## Provider model

`ModelProviderAdapter` supports multiple providers and ordered failover. `OpenAICompatibleProvider` covers endpoints that implement the chat-completions shape; `CustomModelProvider` allows internal enterprise models. Credentials come from the environment or the customer secret store.

The **system under test** and **judge** are intentionally separate. A Claude-based application can be judged by another approved model, deterministic metrics, or a multi-judge policy built above the same contract.

## Native v1.0 metrics

- Exact match.
- Expected-content containment.
- Tool correctness.
- Retrieval-context coverage heuristic.
- Custom metric callback.
- Generic LLM-as-a-judge rubric.

The metric contract is ready for faithfulness, relevance, safety, task completion, trajectory, cost and latency metrics without core changes.

## DeepEval

The optional bridge keeps DeepEval outside core. The bundled bridge verifies dependency presence and defines the process boundary; production teams map approved DeepEval metrics in that adapter. Qualyntra does not claim DeepEval execution unless the optional dependency and metric mapping are installed.

## Regression gates

Dataset runs can gate on total pass rate and per-metric average. Cost and latency fields are present in provider responses so enterprise gates can add budget/latency controls.

