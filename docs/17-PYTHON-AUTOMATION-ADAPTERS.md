<!--
File: docs/17-PYTHON-AUTOMATION-ADAPTERS.md
Purpose: Documents interchangeable Playwright-Python and Selenium-Python execution behind one Qualyntra automation plan/result boundary.
Author: Raushan Raj
-->
# Python Automation Adapters

Qualyntra uses one `AutomationPlan` for Python browser execution. The control plane can send that plan through `automation.python-bridge`; Python selects Playwright or Selenium at runtime and returns one normalized outcome plus evidence records.

## Design

- Playwright and Selenium are lazy optional dependencies owned by the execution project.
- URLs, remote WebDriver endpoints, browser choice, timeouts and artifact directories are configuration inputs, not source constants.
- Selenium remote execution requires both `remoteUrl` and `allowRemote=true`.
- No browser binary paths are embedded; local vendor tooling resolves browser/driver installation.
- Screenshots and Playwright traces are written only to the configured artifact directory and receive SHA-256 evidence hashes.
- Driver/context/browser teardown runs in `finally`, including failed plans.
- Node invokes Python through JSON/stdin with `shell:false`; the Python SDK uses no shell for runner execution.

## Supported actions

`navigate`, `click`, `fill`, `select`, `check`, and `screenshot` are normalized today. Unsupported engine/locator/action combinations fail explicitly rather than silently changing semantics.

## Playwright Python

Supported browsers: Chromium, Firefox and WebKit. Role, label, text, test-id, CSS and XPath locators are mapped to Playwright primitives. Tracing is optional and requires `artifactDirectory`.

## Selenium Python

Supported local browser factories: Chrome, Firefox, Edge and Safari. Remote WebDriver is an explicit opt-in boundary suitable for Selenium Grid/device-cloud adapters. CSS, XPath, test-id, text, role and label locator forms are normalized to WebDriver selectors.

## Testing strategy

Unit tests inject fake Playwright/Selenium runtimes, so release validation does not depend on public websites or locally installed browsers. Live browser certification belongs in compatibility qualification and must not be inferred from unit-test success.
