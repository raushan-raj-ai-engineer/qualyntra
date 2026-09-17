<!--
File: docs/03-MULTI-LANGUAGE-AND-TOOLS.md
Purpose: Explains how one repository supports multiple programming languages, runners, and automation tools.
Author: Raushan Raj
-->

# Multi-Language and Tool Support

Qualyntra does not translate test code between languages at runtime. It normalizes **execution, results, evidence, evaluation and policy** across ecosystems.

### Supported integration surfaces at v1.0

- TypeScript/JavaScript: Playwright Test, Cypress, WebdriverIO and custom processes.
- Python: Pytest plus Playwright/Selenium/Appium in project-owned code via the Python SDK.
- Java: JUnit/TestNG plus Selenium/Playwright/Appium through the Java SDK and normalized result ingestion.
- .NET: contract SDK for NUnit/xUnit/MSTest style integrations; build validation requires a .NET SDK in CI.

### Integration levels

1. **Result ingestion:** JUnit XML -> universal result -> reporting/intelligence.
2. **Runner orchestration:** external process adapter controls execution.
3. **Deep automation integration:** optional tool-specific plugin can expose evidence/healing/generation semantics.

This staged approach lets existing customer suites onboard without migration.

