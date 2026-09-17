<!--
File: README.md
Purpose: Introduces Qualyntra v1.0.0, its architecture, capabilities, and validation workflow.
Author: Raushan Raj
-->

# Qualyntra v1.0.0

**Working codename:** Qualyntra  
**Product class:** Vendor-neutral Quality Engineering + AI/LLM Evaluation Platform  
**Status:** Private product baseline  
**Reference foundation:** TestigentAI v1.9.3 (kept separate and unchanged)

Qualyntra is intentionally designed so the **platform kernel does not depend on Playwright, Selenium, Appium, Pytest, JUnit, DeepEval, OpenAI, Anthropic, or another vendor SDK**. Technology-specific behavior lives behind adapters.

## v1.0 scope

- Vendor-neutral execution, result, evidence, capability, event, configuration, and evaluation contracts.
- Adapter registry with explicit capability discovery and lifecycle.
- Process-based runner integrations for Playwright Test, Pytest, JUnit/TestNG, Cypress, WebdriverIO and custom runners.
- Automation adapter descriptors for Playwright, Selenium and Appium.
- Universal result model plus safe JUnit XML, TRX, Allure JSON, Cucumber JSON, and Robot XML ingestion for low-friction framework onboarding.
- Multi-provider LLM platform with logical model aliases, bounded retry/fallback, health and capability routing, normalized telemetry/cost metadata, custom providers, OpenAI Responses/Azure OpenAI/Anthropic/Gemini/Bedrock/Ollama/vLLM adapters, and deterministic mock support.
- LLM/RAG/agent/tool evaluation engine with native deterministic metrics, single/multi-judge evaluation, custom metrics, reusable datasets/profiles, telemetry and cost/latency-aware regression gates.
- Optional DeepEval Python bridge that does not make DeepEval a core dependency.
- TypeScript SDK plus dependency-free Python and Java runtime/SDK boundaries: Python provides Pytest plus Playwright/Selenium automation; Java provides JVM/Javac discovery, optional JUnit/TestNG capabilities, JSON bridge, secure result normalization and evidence hashing; .NET provides contract SDK foundations.
- CLI, lightweight control-plane HTTP API and static dashboard shell.
- Playwright compatibility/certification policy so future Playwright releases can be qualified without changing platform core.
- Security defaults: network egress opt-in, secrets from environment only, redaction utility, audit events, no credential persistence, and vendor-neutral OIDC/JWKS enterprise bearer authentication with tenant-aware claim mapping.
- Architecture/header/hardcoding/schema/compatibility audits and release validation.

## Local validation

```bash
npm run validate
python3 -m unittest discover -s sdks/python/tests -v
bash scripts/validate-java-sdk.sh
```

Then create the release ZIP with:

```bash
bash scripts/package-release.sh
```

See `docs/00-START-HERE.md` first.


## Enterprise governance

Qualyntra includes tenant-scoped RBAC, evidence-backed release policies, tamper-evident audit records, secret references, and vendor-neutral integration contracts. See `docs/22-ENTERPRISE-GOVERNANCE.md`.

## Control Plane API

Qualyntra includes a versioned `/api/v1` control plane with bearer authentication, tenant-scoped RBAC, idempotent run creation, governance/release endpoints, rate limits, safe errors, and storage-neutral repositories. See `docs/23-CONTROL-PLANE-API.md`.

## Persistence foundation
Durable storage remains adapter-based. The reference PostgreSQL adapter provides tenant-safe repositories, optimistic concurrency, immutable checksummed migrations, durable idempotency, and transactionally serialized audit chains. See `docs/24-PERSISTENCE-FOUNDATION.md`.


## Enterprise identity
Qualyntra supports standards-based OIDC discovery/JWKS JWT verification, multi-issuer authentication, tenant claim mapping, service identities, and group-to-role mapping without identity-vendor SDK coupling. See `docs/25-ENTERPRISE-IDENTITY.md`.

## Enterprise integrations
GitHub, Azure DevOps, Jira, and Jenkins are implemented as secret-referenced, network-policy-governed REST adapters with idempotency/retry controls, rate-limit metadata, webhook verification boundaries, and audit evidence. See `docs/26-ENTERPRISE-INTEGRATIONS.md`.

## Distributed execution
Qualyntra includes vendor-neutral worker, lease, heartbeat, retry, recovery, and capability-matching contracts for horizontal execution without binding the platform to a specific queue or cluster vendor. See `docs/27-DISTRIBUTED-EXECUTION.md`.
## Artifact storage
Qualyntra stores screenshots, traces, videos, logs, reports, and AI/test evidence behind tenant-scoped storage adapters with streaming SHA-256 integrity, retention, local filesystem support, and SDK-neutral S3/Azure Blob boundaries. See `docs/28-ARTIFACT-STORAGE.md`.
