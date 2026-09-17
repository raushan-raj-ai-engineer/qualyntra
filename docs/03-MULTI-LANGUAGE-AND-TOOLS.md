<!--
File: docs/03-MULTI-LANGUAGE-AND-TOOLS.md
Purpose: Explains how one repository supports multiple programming languages, runners, and automation tools.
Author: Raushan Raj
-->

# Multi-Language and Tool Support

Qualyntra does not translate test code between languages at runtime. It normalizes **execution, results, evidence, evaluation and policy** across ecosystems.

### Supported integration surfaces at v1.0

- TypeScript/JavaScript: Playwright Test, Cypress, WebdriverIO and custom processes.
- Python: runtime/package discovery, Pytest execution/discovery, JUnit/evidence normalization, plus executable Playwright/Selenium browser automation through a shared Python SDK plan/result boundary.
- Java: JVM/Javac runtime discovery, optional JUnit/TestNG classpath detection, dependency-free JSON bridge, secure JUnit/TestNG result normalization and evidence hashing; Selenium/Playwright automation remains adapter-owned.
- .NET: contract SDK for NUnit/xUnit/MSTest style integrations; build validation requires a .NET SDK in CI.

### Integration levels

1. **Result ingestion:** JUnit XML -> universal result -> reporting/intelligence.
2. **Runner orchestration:** external process adapter controls execution.
3. **Deep automation integration:** optional tool-specific plugin can expose evidence/healing/generation semantics.

This staged approach lets existing customer suites onboard without migration.



### Python runtime boundary

The Python integration uses a runtime adapter plus a dependency-free SDK and JSON/process boundary. Pytest, Playwright and Selenium remain optional project-owned dependencies. Runtime detection is separate from certification so Qualyntra can support an integration surface without making an unverified version claim.


### Java runtime boundary

The Java integration mirrors the Python architecture: the control plane talks to a language-specific boundary instead of importing Java frameworks into core. JVM/Javac discovery is independent from JUnit/TestNG classpath discovery, and result ingestion is secured against external XML entities. Maven/Gradle are optional project concerns rather than Qualyntra runtime requirements.

## Java automation adapters

Java Playwright and Selenium consume the same portable automation plan as Python and return the same normalized result/evidence model. Vendor libraries remain optional execution-project dependencies discovered at runtime. See `docs/19-JAVA-AUTOMATION-ADAPTERS.md`.

## Mobile automation

Appium is integrated through a language-neutral W3C WebDriver/Appium protocol adapter. Android and iOS use the same Qualyntra automation/result/evidence contracts, while platform-specific capabilities remain deployment configuration.
