<!--
File: docs/26-ENTERPRISE-INTEGRATIONS.md
Purpose: Documents Qualyntra enterprise GitHub, Azure DevOps, Jira, and Jenkins adapters, security boundaries, idempotency, and webhook verification.
Author: Raushan Raj
-->

# Enterprise Integrations

Qualyntra now provides concrete enterprise adapters behind the existing vendor-neutral `IntegrationAdapter` contract. The protected platform packages do not import GitHub, Azure DevOps, Jira, or Jenkins SDKs. Each adapter uses a configurable REST base URL, a secret reference, the platform network policy, and an injectable HTTP transport so self-hosted endpoints and offline tests use the same contract.

## Supported operations

| Adapter | Operations |
|---|---|
| GitHub | commit status, issue creation, issue/PR comment |
| Azure DevOps | Git commit status, work-item creation, work-item comment, build trigger |
| Jira | issue creation, issue comment |
| Jenkins | build/build-with-parameters trigger |

GitHub rich Check Runs are intentionally not treated as a generic token feature because write access to the Checks API is a GitHub App capability. Qualyntra's baseline adapter uses commit statuses for broad compatibility; a GitHub App check-run adapter can be added behind the same integration contract later.

## Credentials and endpoints

Adapters receive `SecretReference` values rather than raw tokens in persisted integration requests. The deployment owns the `SecretResolverRegistry` and may use environment, vault/KMS, or another secret provider. Base URLs are also deployment configuration; source code contains no production vendor endpoints. URLs with embedded username/password credentials are rejected.

Every outbound call is still checked by Qualyntra's deny-by-default network policy and optional host allowlist.

## Idempotency and retry

Qualyntra does not blindly retry external mutations. Retryable HTTP failures are retried only when the request is explicitly idempotent. Duplicate-sensitive operations such as issue/work-item creation and build triggering require an `Idempotency-Key` through the control-plane API. The default adapter store is in-memory for local use; HA deployments should inject a durable `IntegrationDedupeStore` implementation backed by persistence.

Rate-limit headers and retry guidance are normalized into `IntegrationResponse.rateLimit`. Error objects intentionally omit response bodies so a vendor error page cannot leak credentials or sensitive payloads into logs.

## Webhooks

`WebhookVerifier` is a vendor-neutral boundary. `HmacSha256WebhookVerifier` supports HMAC-SHA256 signatures using secret references and timing-safe comparison; it is suitable for GitHub-style `sha256=` signatures and other compatible webhook sources. Other signature schemes can implement the same interface without changing core contracts.

## Audit and tenancy

The control-plane integration endpoint passes the authenticated actor, tenant scope, correlation ID, and idempotency key into the integration request. `IntegrationService` writes secret-safe audit metadata for outbound execution when an audit sink is configured. Payload contents and credential values are never copied into integration audit metadata.

## Vendor notes

- GitHub commit statuses use the repository/status REST resource. Check Run writes remain GitHub-App-specific.
- Azure DevOps uses API `7.1` for Git statuses/work-item creation/build queue and the documented preview version for work-item comments.
- Jira uses REST API v3 and converts plain Qualyntra issue/comment text into Atlassian Document Format.
- Jenkins uses Remote Access API build endpoints. API-token authentication is used by the adapter; no crumb is requested because Jenkins documents API-token-authenticated scripted requests as exempt from the normal crumb requirement.

## Extending

A new enterprise system implements `IntegrationAdapter`, resolves credentials through `SecretReference`, accepts configurable endpoints, obeys `NetworkPolicy`, and registers with the central `AdapterRegistry`. Vendor-specific imports remain under `adapters/integrations/*`.
