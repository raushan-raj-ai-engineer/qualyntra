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
| `apps/agent` | Standalone distributed execution-agent process and container composition |
| `apps/dashboard` | Secure browser SPA, same-origin BFF proxy, server-side session boundary and product views |
| `packages/contracts` | Stable cross-language contracts |
| `packages/core` | Adapter registry, capability model, core events/IDs |
| `packages/agent` | Secure worker identity, remote protocol client, capability discovery, secrets, workspaces and agent lifecycle |
| `packages/execution` | Runner-neutral orchestration |
| `packages/evaluation` | Provider-neutral LLM/RAG/agent evaluation, metric registry, judge consensus, telemetry and release gates |
| `packages/providers` | Vendor-neutral model aliases, routing, retry/fallback, transport, normalized errors, telemetry and cost metadata |
| `packages/reporting` | Unified quality aggregation |
| `packages/artifacts` | Tenant-scoped artifact metadata, integrity, retention, grants and storage orchestration |
| `packages/ingestion` | Vendor-neutral safe loading, detection, limits, metadata and normalization policy for external results |
| `packages/security` | Redaction/network policy |
| `packages/identity` | Vendor-neutral OIDC discovery, JWKS/JWT verification, claim mapping and enterprise authentication |
| `packages/configuration` | Environment-derived configuration |
| `adapters/runtimes` | Language/runtime discovery, lifecycle and health adapters for Python, Java and future runtimes |
| `adapters/runners` | Test-runner process adapters |
| `adapters/automation` | Automation-engine capability and executable bridge adapters |
| `adapters/results` | External result normalization |
| `adapters/llm` | Model providers |
| `adapters/evaluators` | External evaluator bridges |
| `adapters/storage` | Local, S3-compatible, Azure Blob and future object-storage adapters |
| `adapters/integrations` | Vendor-specific GitHub, Azure DevOps, Jira, Jenkins and future enterprise-system adapters |
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

- `packages/distributed/`: vendor-neutral distributed job coordination, worker matching, leases, heartbeats, recovery, and reference queue behavior.

- `packages/artifacts/`: artifact catalog, integrity verification, retention, audited grant and lifecycle services.
- `adapters/storage/`: local filesystem plus SDK-neutral S3-compatible and Azure Blob object-storage boundaries.

- `apps/dashboard/web/`: credential-free browser TypeScript SPA.
- `apps/dashboard/src/`: dashboard HTTP/BFF server and injectable session resolvers.
- `schemas/dashboard-runtime-config.schema.json`: non-secret browser runtime configuration contract.

- `apps/agent/`: standalone execution-agent composition and non-root Docker packaging.
- `packages/agent/`: runner-neutral agent configuration, identity, worker protocol, workspaces, secret materialization, telemetry and graceful drain.
- `schemas/execution-agent-config.schema.json`: non-secret execution-agent deployment configuration contract.
