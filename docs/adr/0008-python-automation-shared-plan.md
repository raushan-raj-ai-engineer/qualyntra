<!--
File: docs/adr/0008-python-automation-shared-plan.md
Purpose: Records the decision to keep Playwright-Python and Selenium-Python interchangeable behind one execution plan/result protocol.
Author: Raushan Raj
-->
# ADR 0008: Python automation engines share one plan/result contract

## Decision

Playwright Python and Selenium Python consume the same vendor-neutral `AutomationPlan` and emit the same `AutomationExecutionResult`/`EvidenceRecord` structures. Vendor packages are lazy-loaded only inside Python engine implementations. Node communicates through the existing JSON-over-stdio bridge.

## Why

This proves Qualyntra's intelligence/control plane is independent of both programming language and browser automation engine, prevents duplicate business logic, keeps optional dependencies optional, and lets future Appium/other Python engines reuse the same orchestration boundary.

## Consequences

Tool-specific features are exposed only when the chosen engine supports them. Live browser/version certification remains a separate compatibility activity.
