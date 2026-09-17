<!--
File: docs/08-RELEASE-VALIDATION.md
Purpose: Documents every automated check executed before producing the single v1.0 release ZIP.
Author: Raushan Raj
-->

# Release Validation

Run:

```bash
node scripts/release-validate.mjs
```

It verifies:

1. strict TypeScript typecheck;
2. Node contract/unit tests;
3. architecture dependency audit;
4. per-file author/purpose metadata audit;
5. credential/external-endpoint hardcoding audit;
6. JSON/schema parse audit;
7. compatibility-registry audit;
8. Python SDK unit tests;
9. Java SDK compilation/runtime smoke test.

The environment used to create the release did not include .NET tooling, Playwright browsers, Selenium server, Appium server or DeepEval. Their product boundaries are therefore validated structurally/contractually, not falsely labeled as live E2E validation. External CI should add those runtime matrices before claiming certification for those adapters.

