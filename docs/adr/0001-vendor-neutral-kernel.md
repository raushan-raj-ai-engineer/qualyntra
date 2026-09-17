<!--
File: docs/adr/0001-vendor-neutral-kernel.md
Purpose: Records the decision to keep all automation/model vendor SDKs outside the product kernel.
Author: Raushan Raj
-->

# ADR 0001 — Vendor-Neutral Kernel

**Decision:** Core packages cannot import vendor automation, runner, evaluator or model-provider libraries.

**Reason:** This lets Playwright/Selenium/Appium/LLM releases evolve independently and prevents language/tool forks.

**Consequence:** Some deep capabilities require adapter-specific plugins, but the quality model remains stable.

