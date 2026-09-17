<!--
File: docs/16-PYTHON-RUNTIME.md
Purpose: Documents Qualyntra's first production-oriented polyglot runtime boundary for Python, Pytest, Playwright, Selenium, results, evidence, and JSON bridge integration.
Author: Raushan Raj
-->

# Python Runtime

The Python runtime is the first proof that Qualyntra's control and intelligence planes are not tied to TypeScript. The integration keeps Python-specific behavior in the Python SDK and adapters while the protected kernel continues to depend only on Qualyntra contracts.

## Runtime discovery

`runtime.python` launches the configured interpreter without a shell and detects:

- Python version, implementation and platform
- Pytest
- Playwright for Python
- Selenium for Python
- pytest-xdist

Package absence is reported as a capability state rather than treated as a platform crash. Compatibility status is resolved against `compatibility/registry.json`; discovery does not imply certification.

## Pytest runner

`runner.pytest` supports:

- health probing
- collection/discovery through `--collect-only`
- normalized process execution
- optional JUnit XML output via `ExecutionRequest.metadata.junitOutputPath`

JUnit XML remains the cross-language result boundary and can be normalized by either the TypeScript result adapter or the Python SDK.

## Python SDK

The dependency-free Python SDK now provides:

- execution/runtime contracts
- shell-free Python module execution
- Pytest execution/discovery helpers
- JUnit XML normalization
- SHA-256 evidence records
- control-plane health/capability queries
- a JSON-over-stdio bridge (`qualyntra-python-bridge`)

Playwright, Selenium and Pytest remain optional customer/runtime dependencies. Qualyntra does not silently install or pin them from the platform kernel.

## Security model

- no `shell=True`
- Python module names are validated before execution
- environment values are explicitly merged by the caller
- runtime endpoints and credentials are not embedded in the SDK
- evidence hashes are calculated locally

## Certification

Python/Pytest/Playwright/Selenium versions detected at runtime are compared to the compatibility registry. Empty certification arrays mean **supported integration surface, not certified runtime version**. Qualification evidence must be added before a version can be marketed as certified.

## Browser automation execution

`automation.python-bridge` now sends the same normalized automation plan to either Playwright Python or Selenium Python. Vendor imports are lazy, artifacts are hashed, Selenium remote execution is explicit opt-in, and release tests use injected fake runtimes rather than public websites. See `17-PYTHON-AUTOMATION-ADAPTERS.md`.
