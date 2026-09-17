<!--
File: docs/19-JAVA-AUTOMATION-ADAPTERS.md
Purpose: Documents interchangeable Playwright-Java and Selenium-Java execution behind one Qualyntra automation plan/result boundary.
Author: Raushan Raj
-->
# Java Automation Adapters

Qualyntra uses the same vendor-neutral `AutomationPlan` for Java browser execution that is already used by Python automation. The Node control plane invokes the dependency-free Java SDK over JSON/stdin. At runtime, the Java SDK selects Playwright or Selenium and returns one normalized result/evidence structure.

## Dependency model

The Qualyntra Java SDK itself compiles with only the JDK. Playwright and Selenium are optional project-owned runtime dependencies and are loaded reflectively only when an automation plan selects that engine. This keeps Maven/Gradle and vendor JARs out of the platform kernel and out of the base release gate.

## Supported actions

`navigate`, `click`, `fill`, `select`, `check`, and `screenshot` are normalized. Playwright additionally supports optional tracing when `tracing=true` and `artifactDirectory` is provided.

## Safety and configuration

- Browser, base URL, timeout, headless mode, remote WebDriver URL, and artifact directory are plan inputs.
- Selenium remote execution requires `allowRemote=true`.
- No browser or driver binary paths are embedded.
- Screenshot and trace paths are confined to the configured artifact directory and receive SHA-256 evidence hashes.
- Engine cleanup runs even when a step fails.
- Node launches the Java bridge with `shell:false`; the classpath is deployment configuration through `classpath` or `QUALYNTRA_JAVA_BRIDGE_CLASSPATH`.
- Unit/smoke tests use fake engines and do not claim live-browser certification.

## Runtime classpath

The Java bridge classpath must include compiled Qualyntra Java SDK classes plus whichever optional browser automation dependencies the project owns. A project can use Maven, Gradle, Bazel, an IDE, or direct `javac`; Qualyntra does not prescribe a build tool.

## Live certification

Release validation proves contracts, bridge behavior, normalization, safety, and compilation. Actual Playwright/Selenium browser versions must be qualified separately through the compatibility/certification workflow before production claims are made.
