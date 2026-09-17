<!--
File: docs/04-ADAPTER-SDK.md
Purpose: Defines adapter contribution rules so new technologies can integrate without modifying the kernel.
Author: Raushan Raj
-->

# Adapter SDK

An adapter must have a globally unique ID, version, descriptor, capability list, health function, and tests. It may depend on a vendor SDK; protected kernel packages may not.

## Custom runner

Use `ProcessRunnerAdapter` and provide command/base arguments/capabilities. Project-level configuration supplies paths, credentials and runtime flags.

## Custom model provider

Implement `ModelProviderAdapter` or wrap callbacks with `CustomModelProvider`. A provider supplies `generate`, health, and capabilities. Never expose raw API keys through result metadata.

## Custom evaluator

Implement `EvaluationMetric`. Return normalized `score` in `[0,1]`, pass/fail against the metric threshold, reason and optional details.

## Review checklist

- No hardcoded credentials/endpoints.
- Network behavior respects policy.
- Timeouts are bounded.
- Input/output normalized to contracts.
- Failure is explicit; no silent success.
- Capabilities accurately describe support.
- Unit/contract test included.
- Documentation updated.

