<!--
File: docs/adr/0009-java-runtime-dependency-free-bridge.md
Purpose: Records the decision to integrate Java through a JDK-only runtime/JSON bridge and optional project-owned JUnit/TestNG classpaths.
Author: Raushan Raj
-->

# ADR 0009: Java runtime uses a dependency-free bridge

## Status

Accepted.

## Context

Qualyntra must support Java enterprises without forcing Maven/Gradle, a specific test framework, or Java vendor dependencies into the platform kernel. JUnit, TestNG, Selenium and Playwright versions also evolve independently from the Qualyntra release cycle.

## Decision

The Java runtime is implemented as:

1. a vendor-neutral TypeScript runtime adapter for JVM/Javac health and capability discovery;
2. a dependency-free Java SDK compiled with the JDK;
3. a JSON-over-stdio bridge for runtime health, result normalization and evidence operations;
4. explicit project-owned classpath discovery for JUnit/TestNG;
5. compatibility metadata stored outside runtime code.

JUnit/TestNG APIs are not imported into the Qualyntra kernel or baseline Java SDK.

## Consequences

- Java can be validated on a clean JDK with no build tool.
- Existing enterprise build systems remain customer-owned.
- Missing JUnit/TestNG libraries degrade capabilities rather than crashing the platform.
- Future Selenium/Playwright Java adapters can build on the same runtime identity and bridge contracts.
- Deep runner-specific functionality remains in adapters, not in the platform core.
