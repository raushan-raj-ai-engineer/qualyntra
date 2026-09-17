<!--
File: docs/02-REPOSITORY-MAP.md
Purpose: Maps every top-level area to its product responsibility and ownership boundary.
Author: Raushan Raj
-->

# Repository Map

| Area | Responsibility |
|---|---|
| `apps/cli` | Local developer/operator commands |
| `apps/control-plane` | HTTP control-plane boundary |
| `apps/dashboard` | UI boundary/documentation |
| `packages/contracts` | Stable cross-language contracts |
| `packages/core` | Adapter registry, capability model, core events/IDs |
| `packages/execution` | Runner-neutral orchestration |
| `packages/evaluation` | Provider-neutral LLM/RAG/agent evaluation, metric registry, judge consensus, telemetry and release gates |
| `packages/providers` | Vendor-neutral model aliases, routing, retry/fallback, transport, normalized errors, telemetry and cost metadata |
| `packages/reporting` | Unified quality aggregation |
| `packages/security` | Redaction/network policy |
| `packages/configuration` | Environment-derived configuration |
| `adapters/runtimes` | Language/runtime discovery, lifecycle and health adapters |
| `adapters/runners` | Test-runner process adapters |
| `adapters/automation` | Automation-engine capability adapters |
| `adapters/results` | External result normalization |
| `adapters/llm` | Model providers |
| `adapters/evaluators` | External evaluator bridges |
| `sdks/*` | Language-specific contracts, bridges, execution helpers and evidence/result normalization |
| `compatibility` | Version certification evidence/policy |
| `schemas` | Cross-language JSON schemas |
| `tests` | Product contract tests |
| `scripts` | Quality/release audits |

