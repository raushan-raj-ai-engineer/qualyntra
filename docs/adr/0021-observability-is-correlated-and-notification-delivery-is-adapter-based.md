<!--
File: docs/adr/0021-observability-is-correlated-and-notification-delivery-is-adapter-based.md
Purpose: Records the decision to keep telemetry and alert delivery vendor-neutral while preserving trace/log/metric correlation.
Author: Raushan Raj
-->

# ADR 0021: Observability is correlated and notification delivery is adapter-based

## Decision

Qualyntra core defines its own stable telemetry, alert, and notification contracts. Protected packages do not import OpenTelemetry, Slack, Microsoft, SMTP, or other vendor SDKs. Exporters and delivery providers attach through interfaces/adapters.

## Why

Quality evidence needs correlation across execution, evaluation, release policy, workers, integrations, and API traffic, but the product must remain deployable with different monitoring and messaging stacks. A stable correlation model avoids making product entities depend on a customer's collector, SIEM, APM, chat, or mail vendor.

## Consequences

- trace/span/correlation/resource fields remain available for OpenTelemetry-compatible export;
- telemetry attributes are redacted before storage/export staging;
- notification endpoints and credentials remain secret-referenced server-side values;
- tenant-scoped alert cooldowns prevent cross-tenant suppression;
- production telemetry persistence/export and durable alert state remain replaceable adapters;
- provider-specific payload formatting exists only in notification adapters.
