<!--
File: docs/07-PLAYWRIGHT-UPGRADE-POLICY.md
Purpose: Defines the release-qualification process for future Playwright versions and browser binaries.
Author: Raushan Raj
-->

# Playwright Upgrade Policy

Qualyntra itself does not pin or import Playwright in the kernel. A **certified Playwright reference adapter/consumer** should pin an exact Playwright version.

When Playwright releases a new version:

1. Detect the candidate dependency.
2. Read its official release notes and breaking changes.
3. Install the exact candidate and matching browser binaries.
4. Run Chromium/Firefox/WebKit compatibility tests on supported OS targets.
5. Validate auth/storage state, reporters/results, traces/evidence, downloads/uploads, network interception, visual/accessibility hooks and any healing/generation plugin.
6. Record evidence under `compatibility/`.
7. Human-review failures and API changes.
8. Promote candidate to certified only after all mandatory checks pass.

Core features use capability discovery rather than `if version >= X` logic. If a vendor change forces a version workaround, keep it local to the adapter.

