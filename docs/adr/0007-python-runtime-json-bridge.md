<!--
File: docs/adr/0007-python-runtime-json-bridge.md
Purpose: Records the decision to integrate Python through contracts and JSON/process boundaries instead of embedding Python dependencies in the TypeScript kernel.
Author: Raushan Raj
-->

# ADR 0007: Python runtime uses a process/JSON boundary

## Decision

Qualyntra will keep its platform kernel language-neutral. Python runtime discovery and execution are implemented through a dedicated runtime adapter and a dependency-free Python SDK. Cross-process integration uses JSON over standard input/output or existing normalized result formats such as JUnit XML.

## Rationale

Embedding Python, Pytest, Selenium, or Playwright-Python libraries inside the TypeScript kernel would create release coupling and make multi-language certification harder. A process boundary lets each language ecosystem own its dependencies while preserving shared execution, result, evidence, compatibility, and governance contracts.

## Consequences

- Python dependencies can evolve independently.
- Existing Python suites can onboard without rewriting tests.
- Runtime/package versions are discovered rather than hardcoded.
- Failures are normalized at the bridge boundary.
- Deep vendor-specific automation features remain adapter responsibilities.
