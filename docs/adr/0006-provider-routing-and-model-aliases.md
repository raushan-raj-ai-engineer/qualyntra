<!--
File: docs/adr/0006-provider-routing-and-model-aliases.md
Purpose: Records the decision to route logical model aliases through vendor-neutral provider infrastructure instead of binding evaluation code to provider/model names.
Author: Raushan Raj
-->

# ADR 0006: Provider routing and logical model aliases

## Status

Accepted.

## Context

A commercial quality platform must evaluate systems across multiple hosted, private, and local LLM providers. Hardcoding vendor models into evaluation profiles would create lock-in, duplicate fallback logic, leak operational concerns into metrics, and make model migrations risky.

## Decision

Qualyntra will keep `ModelProviderAdapter` as the evaluation boundary and place routing concerns in `packages/providers`. Evaluation code references logical aliases. Alias definitions resolve to ordered provider/model candidates. The router owns health checks, bounded retries, configured fallback, normalized errors, telemetry and optional externally supplied cost metadata.

Vendor HTTP shapes remain under `adapters/llm/*`. The protected kernel may not import vendor SDKs. Provider adapters receive endpoints and credentials from runtime configuration rather than source constants.

## Consequences

- A judge profile can move between vendors without modifying metric code.
- Private enterprise models and local runtimes participate through the same route contract.
- Provider pricing changes do not require product releases because cost rates are external data.
- Live vendor compatibility certification remains separate from offline adapter contract validation.
- Streaming, embeddings, tool invocation and multimodal payloads can be introduced later without changing the alias/routing ownership boundary.
