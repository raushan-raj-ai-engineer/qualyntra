<!--
File: docs/adr/0012-external-results-before-runner-migration.md
Purpose: Records the decision to make normalized external result ingestion a first-class onboarding path before requiring execution-framework migration.
Author: Raushan Raj
-->

# ADR 0012: External Results Before Runner Migration

## Status
Accepted.

## Context
Enterprise teams commonly have years of existing automation across Cypress, WebdriverIO, Robot Framework, .NET, Java and Python. Requiring them to migrate execution frameworks before receiving Qualyntra reporting/intelligence creates unnecessary adoption friction.

## Decision
Qualyntra provides a vendor-neutral result-ingestion service and adapters for common machine-readable artifacts. Ingestion is separate from orchestration: a team can normalize existing results first and later adopt runner or deep-automation adapters independently.

Vendor-format detection and parsing remain under `adapters/results`; `packages/ingestion` owns only safe loading, registry resolution, limits, metadata and normalization policy.

## Consequences
- Customers can onboard without rewriting test code.
- Result formats can evolve independently of execution adapters.
- File/XML safety is enforced centrally.
- Native framework features that are absent from exported result files cannot be invented by Qualyntra; deeper evidence requires deeper adapters later.
