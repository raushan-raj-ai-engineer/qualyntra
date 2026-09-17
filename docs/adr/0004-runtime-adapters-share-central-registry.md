<!--
File: docs/adr/0004-runtime-adapters-share-central-registry.md
Purpose: Records the decision to reuse the central adapter registry for runtime lifecycle integrations rather than introducing a second registry.
Author: Raushan Raj
-->
# ADR 0004: Runtime adapters share the central adapter registry

## Status

Accepted.

## Context

Qualyntra needs lifecycle-aware runtime integrations for Playwright and future automation engines. Creating a separate runtime registry would duplicate identity, registration, replacement, and lookup behavior already owned by `AdapterRegistry`.

## Decision

`RuntimeManager` will orchestrate only runtime adapters but store them in the existing central `AdapterRegistry`. It maintains runtime membership without creating a second adapter source of truth.

## Consequences

- Adapter IDs remain globally unique.
- Runtime lifecycle behavior can evolve without changing basic adapter registration.
- Future runtime types share consistent discovery and governance.
- Platform code avoids vendor dependencies.
