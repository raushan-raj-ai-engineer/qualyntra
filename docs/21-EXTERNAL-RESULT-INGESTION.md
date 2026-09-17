<!--
File: docs/21-EXTERNAL-RESULT-INGESTION.md
Purpose: Documents how existing automation frameworks onboard into Qualyntra through safe normalized result ingestion without rewriting tests.
Author: Raushan Raj
-->

# External Result Ingestion

Qualyntra can ingest existing framework artifacts before a team adopts a Qualyntra execution adapter. This is the lowest-friction enterprise onboarding path.

## Built-in formats

| Format | Typical producers |
|---|---|
| JUnit XML | Pytest, JUnit/TestNG, Cypress, WebdriverIO, Robot xUnit, many CI tools |
| TRX | `dotnet test`, VSTest, MSTest and other Microsoft test runners |
| Allure result JSON | Allure integrations that emit `*-result.json` |
| Cucumber JSON | Cucumber JSON formatters across supported implementations |
| Robot XML | Robot Framework native `output.xml` |

All formats normalize into `UniversalTestResult`; reporting, failure intelligence and future analytics therefore consume one result contract.

## Safety model

- Maximum input size and maximum parsed-result count are enforced.
- File ingestion can be confined to an allowed root and uses resolved real paths to prevent traversal/symlink escape.
- XML containing `DOCTYPE` or `ENTITY` declarations is rejected before adapters run.
- Empty parse results fail closed by default instead of silently producing a successful ingestion.
- Source metadata stores only the source filename, format and a SHA-256 result fingerprint; absolute machine paths are not added to normalized result metadata.
- Duplicate suppression is opt-in because repeated/retried tests may be meaningful evidence.

## CLI

After `npm run build`:

```bash
node dist/apps/cli/src/main.js ingest-results ./artifacts/junit.xml junit-xml
```

The CLI confines file access to the current working directory by default. Optional runtime identity can be supplied with `QUALYNTRA_RESULT_LANGUAGE`, `QUALYNTRA_RESULT_RUNNER`, and `QUALYNTRA_RUN_ID`.

## Adapter SDK

Custom result formats register a `ResultAdapter` with `ResultIngestionRegistry`. The protected `packages/ingestion` layer contains no Cypress, Allure, Robot, Microsoft or other vendor imports; built-in wiring lives under `adapters/results/default-registry`.

## Adoption flow

```text
Existing test suite
      |
      v
JUnit / TRX / Allure / Cucumber / Robot artifact
      |
      v
ResultIngestionService
      |
      v
UniversalTestResult
      |
      +--> Reporting
      +--> Failure intelligence
      +--> Release quality gates
      +--> Future analytics / control plane
```
