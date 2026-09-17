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
| `packages/ingestion` | Vendor-neutral safe loading, detection, limits, metadata and normalization policy for external results |
| `packages/security` | Redaction/network policy |
| `packages/configuration` | Environment-derived configuration |
| `adapters/runtimes` | Language/runtime discovery, lifecycle and health adapters for Python, Java and future runtimes |
| `adapters/runners` | Test-runner process adapters |
| `adapters/automation` | Automation-engine capability and executable bridge adapters |
| `adapters/results` | External result normalization |
| `adapters/llm` | Model providers |
| `adapters/evaluators` | External evaluator bridges |
| `sdks/*` | Language-specific contracts, bridges, execution helpers and evidence/result normalization |
| `compatibility` | Version certification evidence/policy |
| `schemas` | Cross-language JSON schemas |
| `tests` | Product contract tests |
| `scripts` | Quality/release audits |


- `adapters/automation/java-bridge/`: Node-to-Java JSON bridge for Playwright/Selenium Java execution.
- `sdks/java/.../Automation*`, `PlaywrightJavaEngine`, `SeleniumJavaEngine`: dependency-optional Java automation execution.
- `tests/java-automation/`: Node-side Java automation bridge contract tests.

- `adapters/results/default-registry/`: prioritized built-in result format detection/wiring.
- `tests/ingestion/`: external result adapter, registry and ingestion-safety contract tests.

- `packages/governance/`: RBAC, tenancy, audit, release policy and governance orchestration.
- `packages/integrations/`: vendor-neutral integration orchestration over registered adapters.

- `packages/control-plane/` - versioned authenticated tenant-aware REST API, repository contracts, rate limiting, and server factory.
- `schemas/control-plane-api.openapi.json` - machine-readable `/api/v1` contract.

- `packages/persistence` - vendor-neutral persistence errors and repository conformance.
- `adapters/persistence/postgres` - optional PostgreSQL driver, repositories, audit store, health checks, and migrations.
