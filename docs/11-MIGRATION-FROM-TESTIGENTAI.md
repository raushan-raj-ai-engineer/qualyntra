<!--
File: docs/11-MIGRATION-FROM-TESTIGENTAI.md
Purpose: Explains how proven TestigentAI capabilities should migrate without modifying the frozen v1.9.3 reference repository.
Author: Raushan Raj
-->

# Migration From TestigentAI v1.9.3

TestigentAI v1.9.3 remains unchanged. Migration is by capability, not by bulk copying Playwright-coupled code.

| TestigentAI capability | Qualyntra destination |
|---|---|
| Requirement/application intelligence | future `packages/intelligence` modules using neutral contracts |
| Playwright runner | `adapters/runners/playwright-test` |
| Playwright page/healing mechanics | future `adapters/automation/playwright` deep plugin |
| Business reporting model | normalized `packages/contracts/result` + `packages/reporting` |
| AI providers | `adapters/llm/*` |
| Agentic/MCP | future control-plane integration consuming neutral contracts |
| DB/API contract intelligence | future tool-neutral adapters/packages |
| Benchmarks/adoption | future analytics modules over normalized events/results |

Migration rule: no copied module enters a protected kernel package until all vendor types have been removed from its public API.

