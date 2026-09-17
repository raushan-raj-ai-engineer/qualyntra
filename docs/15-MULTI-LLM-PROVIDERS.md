<!--
File: docs/15-MULTI-LLM-PROVIDERS.md
Purpose: Documents Qualyntra multi-LLM provider routing, model aliases, retries, fallback, telemetry, cost metadata, security boundaries, and adapter responsibilities.
Author: Raushan Raj
-->

# Multi-LLM Provider Platform

Qualyntra separates **evaluation logic** from **model-provider execution**. Evaluation code consumes the stable `ModelProviderAdapter` contract; routing, aliases, retries, fallback, telemetry, cost calculation, and vendor-specific HTTP mapping are independent layers.

## Design goals

- No vendor SDK import in the protected platform kernel.
- No API keys, public provider endpoints, deployment names, or physical model names hardcoded in core packages.
- Logical aliases such as `quality-judge`, `judge-fast`, or `offline-judge` can route to one or more physical providers.
- Provider adapters perform one inference attempt; the router owns bounded retry and cross-provider fallback.
- Health checks validate safe configuration/network policy without sending a billable model inference request.
- Cost rates are supplied externally because vendor pricing changes independently of Qualyntra releases.
- Every route attempt can emit normalized telemetry without persisting prompts by default.

## Supported adapter surfaces

| Adapter | API surface implemented | Authentication boundary |
|---|---|---|
| OpenAI Responses | Responses API | Bearer token supplied by caller |
| Azure OpenAI | Azure OpenAI v1 Responses | API key or bearer token supplied by caller |
| Anthropic | Messages API | API key + explicit API version |
| Gemini | `generateContent` | API key supplied by caller |
| Amazon Bedrock | Converse | Bedrock bearer token or caller-provided signed headers |
| Ollama | Chat API | Optional bearer/custom headers for private gateways |
| vLLM | OpenAI-compatible chat completions | Same transport contract as OpenAI-compatible endpoints |
| Custom | Customer hooks | Entirely customer-defined |

The adapters intentionally advertise only the capabilities Qualyntra actually implements through the current text request contract. Model-specific capabilities can be overridden by configuration when a certified adapter supports them.

## Logical aliases

Application and evaluation code should avoid vendor model names:

```ts
aliases.register({
  alias: 'quality-judge',
  candidates: [
    { providerId: 'enterprise-primary', model: process.env.PRIMARY_JUDGE_MODEL ?? '' },
    { providerId: 'enterprise-secondary', model: process.env.SECONDARY_JUDGE_MODEL ?? '' },
  ],
});
```

The physical names above are deployment configuration, not source constants.

## Routing lifecycle

1. Resolve the logical alias.
2. Sort configured candidates by priority.
3. Verify required adapter capabilities.
4. Check non-billable provider health/configuration.
5. Attempt generation using the physical model for that candidate.
6. Retry only normalized retryable failures within a bounded policy.
7. Fall back only for configured error categories.
8. Normalize tokens, request ID, retry/fallback metadata, latency and optional cost.
9. Emit telemetry through a pluggable sink.

Authentication, authorization, rate limiting, timeout, network, invalid request, content filtering, server errors, unavailability and unknown failures have separate normalized categories.

## Cost governance

Qualyntra ships **no built-in vendor price table**. `ProviderCostCatalog` accepts approved rates from customer configuration or a future centrally managed pricing service. This prevents release code from silently becoming financially stale.

## Amazon Bedrock authentication

The Bedrock adapter accepts either a bearer token or a `signHeaders` callback. The callback keeps SigV4/IAM credential handling outside the platform kernel and allows organizations to use their approved AWS credential chain or signing library without Qualyntra storing long-lived AWS secrets.

## Network security

Every HTTP provider adapter invokes Qualyntra `NetworkPolicy` before egress. Production deployments should use explicit host allowlists. Custom headers and credentials are accepted at adapter construction time and are never written to source-controlled configuration by the platform.

## Testing strategy

Provider adapter tests use an injectable transport and therefore make no live external calls. Contract tests verify request mapping, response normalization, retries, fallback, health, error classification, telemetry, cost estimation, and direct use of a routed provider as an LLM judge.

Live provider certification should be performed separately with organization-owned credentials, controlled budgets and provider-specific compatibility evidence.
