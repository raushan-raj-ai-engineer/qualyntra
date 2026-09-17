# Mobile Appium Runtime

<!-- Purpose: Documents Qualyntra's Appium mobile runtime, Android/iOS session model, security boundaries, and normalized execution behavior. -->
<!-- Author: Raushan Raj -->

Qualyntra treats Appium as an external runtime reached through the W3C WebDriver/Appium HTTP protocol. The protected platform kernel does not import or bundle Appium client libraries.

## Supported scope

- Android and iOS session capabilities.
- Appium server readiness/version discovery through `/status`.
- W3C session creation and guaranteed session deletion.
- Accessibility ID, ID, class name, XPath, Android UIAutomator, iOS predicate, and iOS class-chain locators.
- Tap/click, fill, clear, check, coordinate swipe/scroll, screenshots, page source, navigation, app install/activate/terminate/remove.
- Guarded `mobile:` execute commands for driver-specific functionality.
- Local Appium and explicitly opted-in remote/device-cloud endpoints.
- Custom HTTP headers for caller-owned authentication without credentials in source or URLs.

## Security controls

Remote hosts require `allowRemote=true`. Credentials embedded in a server URL are rejected; use `mobile.headers` instead. `executeMobile` is disabled unless `mobile.allowExecuteMobile=true`, and `mobile: shell` requires the additional `mobile.allowUnsafeMobileCommands=true` gate.

## Capabilities

Qualyntra emits W3C capabilities using `platformName` plus `appium:options` for Appium-specific fields. Custom capabilities stay configuration-driven so new Appium drivers and cloud capabilities do not require changes to the platform kernel.

## Evidence

Screenshots and page-source artifacts are confined to the configured `artifactDirectory` and receive SHA-256 hashes before being returned as universal Qualyntra evidence records.

## Compatibility

The Appium server version is discovered dynamically from `/status` and resolved against `compatibility/registry.json`. No Appium version is hardcoded into runtime implementation files.
