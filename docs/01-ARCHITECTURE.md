<!--
File: docs/01-ARCHITECTURE.md
Purpose: Documents the control-plane/execution-plane architecture and dependency direction.
Author: Raushan Raj
-->

# Architecture

```text
                         QUALYNTRA
                Quality Intelligence Plane
                           |
        +------------------+------------------+
        |                  |                  |
    Contracts         Evaluation          Reporting
        |                  |                  |
        +------------------+------------------+
                           |
                     Adapter Registry
                           |
      +--------------------+-------------------------+
      |                    |                         |
   Runners             Automation                 LLM/Eval
 Playwright Test       Playwright                OpenAI-compatible
 Pytest                Selenium                  Custom providers
 JUnit/TestNG          Appium                    DeepEval bridge
 Cypress/WebdriverIO                              Native metrics
 Custom process
```

The **control plane** owns contracts, policies, normalized results, evaluation and reporting. The **execution plane** owns test-framework/runtime processes and vendor SDKs.

### Dependency direction

`apps -> packages -> contracts` and `adapters -> packages/contracts` are allowed. `packages/core` never imports `adapters`.

### Why this survives Playwright releases

Playwright changes are confined to the Playwright adapter/reference consumer. Qualyntra core consumes capabilities and normalized results, not Playwright classes (`Page`, `Locator`, `Reporter`, etc.).

