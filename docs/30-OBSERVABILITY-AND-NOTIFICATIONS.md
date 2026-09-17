<!--
File: docs/30-OBSERVABILITY-AND-NOTIFICATIONS.md
Purpose: Defines Qualyntra telemetry, alerting, correlation, and notification architecture without observability-vendor coupling.
Author: Raushan Raj
-->

# Observability + Notifications

## Goal

Make execution, control-plane, worker, evaluation, release, and integration behavior diagnosable without binding platform core to a telemetry vendor or notification SDK.

## Telemetry model

Qualyntra exposes vendor-neutral records for logs, metrics, spans, and component health. All four signals can carry tenant scope and correlation identifiers. Logs and spans can carry trace/span identifiers so an exporter can map them into OpenTelemetry-compatible backends without requiring the OpenTelemetry SDK in protected packages.

`TelemetryContextManager` uses the Node asynchronous context boundary to propagate correlation, trace, tenant, and actor metadata across asynchronous work. The reference in-memory store is bounded and intended for local use/tests/exporter staging, not as the production telemetry database.

## Data safety

Telemetry attributes are recursively redacted before storage. The default sensitive-key set covers authorization, API keys, tokens, passwords, secrets, and cookies. Platform code should still avoid placing raw secret values in free-form log messages.

Telemetry queries enforce tenant hierarchy and reject invalid tenant scopes and invalid time windows. Metrics reject non-finite values and spans reject backwards time ranges.

## Alerting

`AlertEngine` evaluates explicit metric rules with threshold operators, severity, tenant scope, cooldown, and one or more notification adapter IDs. Cooldowns are keyed by rule plus tenant scope to prevent one tenant from suppressing another tenant's alert.

The foundation uses an in-memory alert state store. Durable alert-policy/state persistence can be added behind the same contracts without changing alert evaluation or notification adapters.

## Notification boundary

Notifications use a new `notification` adapter kind. The platform provides:

- generic HTTPS webhook adapter;
- Slack incoming-webhook adapter;
- Microsoft Teams Workflows webhook adapter;
- email adapter over an injected transport.

Webhook URLs are `SecretReference` values, not normal configuration strings. They are resolved only server-side immediately before delivery, checked by the outbound network policy, and must use HTTPS outside loopback development endpoints.

Email intentionally uses an injected transport instead of embedding SMTP/provider SDK dependencies in platform code. This leaves SMTP, cloud mail services, and enterprise relay choice to deployment adapters.

## Delivery reliability

Notification retries are bounded and occur only when the notification has an idempotency/deduplication key and the failure is classified transient. Successful deliveries may be deduplicated for a bounded TTL. Notification audit records contain adapter ID, severity, request/external IDs and correlation—not the notification body or credentials.

## Control-plane API

Authenticated, tenant-authorized endpoints are available for:

- `GET /api/v1/observability/summary`
- `GET /api/v1/alerts`
- `GET /api/v1/notifications`
- `POST /api/v1/notifications/{id}/actions`

Notification mutations require `notifications.manage`. Read paths use the normal `platform.read` permission.

## Dashboard

The dashboard includes an Observability page for telemetry counts, health totals, recent alerts, and registered notification adapters. The browser continues to access only the same-origin BFF and never receives webhook URLs, email credentials, telemetry-backend credentials, or notification provider secrets.

## OpenTelemetry compatibility

Qualyntra intentionally keeps core contracts independent of OpenTelemetry SDK packages. The contracts retain resource attributes, trace IDs, span IDs, correlation IDs, span events and exemplars so future OTLP/OpenTelemetry exporters can map data without redesigning platform business contracts.
