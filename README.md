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
- Universal result model and JUnit XML ingestion.
- Multi-provider LLM platform with logical model aliases, bounded retry/fallback, health and capability routing, normalized telemetry/cost metadata, custom providers, OpenAI Responses/Azure OpenAI/Anthropic/Gemini/Bedrock/Ollama/vLLM adapters, and deterministic mock support.
- LLM/RAG/agent/tool evaluation engine with native deterministic metrics, single/multi-judge evaluation, custom metrics, reusable datasets/profiles, telemetry and cost/latency-aware regression gates.
- Optional DeepEval Python bridge that does not make DeepEval a core dependency.
- TypeScript SDK plus a dependency-free Python runtime/SDK with Pytest execution, runtime discovery, JUnit/evidence normalization, JSON bridge, and interchangeable Playwright-Python/Selenium-Python automation plans; Java and .NET SDK contracts/examples.
- CLI, lightweight control-plane HTTP API and static dashboard shell.
- Playwright compatibility/certification policy so future Playwright releases can be qualified without changing platform core.
- Security defaults: network egress opt-in, secrets from environment only, redaction utility, audit events and no credential persistence.
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

