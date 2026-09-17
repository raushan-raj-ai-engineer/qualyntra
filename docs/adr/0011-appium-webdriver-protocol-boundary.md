# ADR 0011: Appium Uses a Protocol Boundary Instead of a Bundled Client SDK

<!-- Purpose: Records the decision to integrate Appium through W3C WebDriver/Appium HTTP contracts while keeping client SDKs and mobile drivers external. -->
<!-- Author: Raushan Raj -->

## Decision

Qualyntra communicates with Appium through its HTTP protocol and does not bundle a JavaScript, Python, Java, or .NET Appium client in the platform kernel.

## Rationale

- Appium already provides a cross-language WebDriver-compatible server boundary.
- Android/iOS drivers can evolve independently from Qualyntra.
- Device clouds can be reached through the same configurable endpoint/header contract.
- The platform remains usable in environments where Appium is not installed.
- Runtime version qualification remains data-driven through the compatibility registry.

## Safety

Remote execution is explicit, URL credentials are rejected, session cleanup is guaranteed, artifacts are confined, and driver-specific `mobile:` commands require opt-in. High-risk `mobile: shell` requires a second explicit opt-in.
