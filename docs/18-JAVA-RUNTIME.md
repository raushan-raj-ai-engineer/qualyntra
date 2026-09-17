<!--
File: docs/18-JAVA-RUNTIME.md
Purpose: Documents Qualyntra's Java runtime discovery, dependency-free SDK bridge, JUnit/TestNG result normalization, evidence hashing, and compatibility boundaries.
Author: Raushan Raj
-->

# Java Runtime

Qualyntra treats Java as a language/runtime integration rather than as a platform dependency. The protected TypeScript kernel never imports JUnit, TestNG, Selenium, Playwright Java, Maven or Gradle.

## Responsibilities

The Java runtime feature provides:

- JVM and `javac` discovery.
- Java version, vendor, VM and platform metadata.
- Explicit classpath probing for JUnit 5 and TestNG when a project supplies a classpath.
- Runtime lifecycle and health through the common `RuntimeAdapter` contract.
- A dependency-free Java SDK bridge using JSON over standard input/output.
- Secure JUnit XML normalization.
- Native TestNG XML normalization.
- SHA-256 evidence hashing.
- Compatibility status separated from mere runtime detection.

## Runtime configuration

Executable overrides are optional:

```text
QUALYNTRA_JAVA_EXECUTABLE
QUALYNTRA_JAVAC_EXECUTABLE
QUALYNTRA_JAVA_CLASSPATH
```

A project may instead supply `javaClasspath` in runtime metadata. Qualyntra never scans a developer machine for random JARs and never assumes Maven or Gradle is installed.

## Classpath discovery

JUnit/TestNG support is a capability, not a hard dependency. When a classpath is supplied, the runtime uses a temporary JDK source-file probe and `Class.forName` to check:

```text
org.junit.jupiter.api.Test
org.testng.TestNG
```

The temporary probe is removed after discovery. Missing frameworks are reported as unavailable capabilities rather than startup failures.

## JSON bridge

The Java SDK exposes a dependency-free bridge with these operations:

```text
health
results.junit.normalize
results.testng.normalize
evidence.file
```

The bridge emits the same camelCase wire concepts used by the TypeScript and Python boundaries.

## XML security

Result normalization disables DOCTYPE declarations, external entities, external DTD access and external schema access. This prevents test-result ingestion from becoming an XML external entity boundary.

## Build-tool neutrality

Qualyntra's release validation compiles the SDK directly with `javac` and executes smoke tests with `java`. Customer projects remain free to use Maven, Gradle, Bazel or another build system.

The next Java feature can add executable Selenium-Java and Playwright-Java automation adapters without changing this runtime contract.
