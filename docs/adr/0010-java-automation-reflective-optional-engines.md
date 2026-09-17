<!--
File: docs/adr/0010-java-automation-reflective-optional-engines.md
Purpose: Records why Java Playwright and Selenium remain optional runtime dependencies behind one shared automation plan/result protocol.
Author: Raushan Raj
-->
# ADR 0010: Java automation engines are optional reflective adapters

## Decision

Playwright Java and Selenium Java consume the same vendor-neutral automation plan and emit the same normalized outcome. The base Java SDK does not compile against either vendor library; it discovers and invokes them reflectively when they are present on the execution classpath.

## Why

This preserves a dependency-free SDK and release gate, avoids forcing Maven/Gradle or vendor JARs on every Qualyntra installation, and keeps Java consistent with the platform rule that automation engines are adapters rather than core dependencies.

## Consequences

Reflection code must be covered by contract/unit tests and live compatibility qualification. Vendor API changes are isolated to engine implementations, while the bridge, plan, result, evidence, and control-plane contracts remain stable.
