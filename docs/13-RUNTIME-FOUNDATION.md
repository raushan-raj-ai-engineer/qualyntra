<!--
File: docs/13-RUNTIME-FOUNDATION.md
Purpose: Documents the runtime lifecycle, compatibility classification, health model, and rules for future automation-engine adapters.
Author: Raushan Raj
-->
# Runtime Foundation

## Goal

Qualyntra treats Playwright, Selenium, Appium, Cypress, WebdriverIO, language runners, and future engines as optional runtime integrations rather than platform-kernel dependencies.

## Architectural rule

The platform kernel must never import a vendor automation SDK. Runtime adapters may detect and use vendor packages only inside adapter boundaries.

## Shared registry

`RuntimeManager` deliberately reuses `AdapterRegistry`. Qualyntra has one adapter source of truth rather than parallel registries that can drift.

## Lifecycle

A runtime can move through `created`, `initializing`, `ready`, `degraded`, `stopping`, `stopped`, and `failed` states.

Runtime availability and compatibility are separate concepts. A runtime can be installed but uncertified, or absent without making the Qualyntra platform unhealthy.

## Compatibility states

- `certified`: version has passed Qualyntra qualification and appears in the certified list.
- `candidate`: version is currently under qualification.
- `reference`: historical/reference baseline only; this is not a certification claim.
- `uncertified`: detected but not qualified for the platform release.
- `unknown`: no version or policy can be resolved.

Qualyntra does not infer that an unlisted version is incompatible. It reports `uncertified` until qualification evidence exists.

## Playwright behavior

The Playwright runtime adapter does not bundle `@playwright/test` or `playwright` into the platform core. It detects an installed package from the selected execution workspace, reports the detected version, and resolves that version through `compatibility/registry.json`.

Future Playwright releases therefore require qualification data and, only when necessary, changes inside the Playwright adapter. Core runtime contracts remain unchanged.

## Future adapters

Selenium, Appium, Cypress, WebdriverIO, Pytest, JUnit, TestNG, NUnit, and custom enterprise runtimes should implement the same runtime contracts. Vendor-specific version discovery belongs in each adapter.
