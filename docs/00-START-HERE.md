<!--
File: docs/00-START-HERE.md
Purpose: Gives developers and reviewers the authoritative starting point for the v1.0 product repository.
Author: Raushan Raj
-->

# Start Here

Qualyntra v1.0.0 is a **single private product repository**, not a sequence of version folders. The repository is brand-neutral internally and uses Qualyntra as a working product name.

## Non-negotiable architecture rules

1. `packages/contracts`, `packages/core`, `packages/evaluation`, `packages/reporting`, `packages/security`, and `packages/configuration` cannot import vendor automation/model libraries.
2. All vendor/runtime integrations belong under `adapters/` or language `sdks/`.
3. Secrets come from environment/secret stores, never source files.
4. Network egress is denied unless explicitly enabled and may be host allowlisted.
5. Results and evidence are normalized before intelligence/reporting consumes them.
6. New Playwright/Selenium/Appium/LLM versions are qualified through compatibility evidence; core does not branch on vendor versions.
7. Custom adapters extend contracts; they do not patch kernel code.
8. Product docs must change with architecture or behavior changes.

## Recommended first verification

```bash
node scripts/release-validate.mjs
```

Read `01-ARCHITECTURE.md`, then `04-ADAPTER-SDK.md`, `05-LLM-TESTING.md`, `08-RELEASE-VALIDATION.md`, `16-PYTHON-RUNTIME.md`, `17-PYTHON-AUTOMATION-ADAPTERS.md`, and `18-JAVA-RUNTIME.md`.


- `docs/19-JAVA-AUTOMATION-ADAPTERS.md` — Java Playwright/Selenium execution adapters and safety model.

- `20-MOBILE-APPIUM-RUNTIME.md` — Android/iOS Appium runtime, execution, security, and evidence model.

- `21-EXTERNAL-RESULT-INGESTION.md` — safe JUnit/TRX/Allure/Cucumber/Robot onboarding into the universal result model.
