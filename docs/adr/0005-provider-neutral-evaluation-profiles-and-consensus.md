<!--
File: docs/adr/0005-provider-neutral-evaluation-profiles-and-consensus.md
Purpose: Records the decision to make evaluation profiles, telemetry, regression gates, and multi-judge consensus first-class provider-neutral platform capabilities.
Author: Raushan Raj
-->

# ADR 0005: Provider-Neutral Evaluation Profiles and Consensus

## Status

Accepted.

## Context

A commercial quality platform must evaluate AI systems across different model providers, customer-hosted models, external evaluation frameworks, and deterministic business rules. Binding the core engine to one judge model or evaluation library would create vendor lock-in and make enterprise deployment harder.

## Decision

Qualyntra will:

1. keep model providers behind `ModelProviderAdapter`;
2. keep evaluation libraries behind evaluator adapters;
3. represent test data as portable `EvaluationDataset` objects;
4. compose metrics and gates through reusable `EvaluationProfile` objects;
5. normalize judge cost, latency, and token usage into metric/run telemetry;
6. support single-judge and quorum-based multi-judge metrics;
7. make release gates operate on normalized summaries rather than vendor-specific response objects.

## Consequences

- New providers and evaluator libraries can be added without changing the evaluation engine.
- A customer can use deterministic evaluation only and disable network access entirely.
- Judge disagreement and provider failure can be handled explicitly rather than silently.
- Cost/performance governance becomes part of release quality.
- Adapter authors must normalize provider-specific usage data when it is available.
