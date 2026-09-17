<!--
File: compatibility/playwright/README.md
Purpose: Defines how new Playwright releases are qualified without coupling Qualyntra core to a Playwright version.
Author: Raushan Raj
-->

# Playwright Compatibility Policy

Qualyntra core never imports Playwright. The Playwright runner/automation adapters are the change boundary.

For every candidate Playwright release:

1. Create a dependency-update branch in the adapter consumer/reference project.
2. Install the candidate package **and its matching browser binaries**.
3. Run contract tests for execution, reporter ingestion, auth/storage state, trace/evidence, healing integration, generation and result normalization.
4. Exercise Chromium, Firefox and WebKit on the operating systems supported by the product tier.
5. Record a compatibility evidence JSON using `compatibility/matrix.schema.json`.
6. Promote to `certified` only after human review of breaking changes and release notes.
7. Never use a broad semver range in a certified reference implementation.

Capability checks are preferred to version conditionals. Version checks may exist only inside an adapter when a vendor gives no capability API.

