<!--
File: docs/adr/0017-enterprise-integrations-use-secret-referenced-rest-adapters.md
Purpose: Records the decision to implement enterprise systems as REST adapters with secret references, idempotent mutation controls, and no vendor SDK coupling.
Author: Raushan Raj
-->

# ADR 0017: Enterprise integrations use secret-referenced REST adapters

## Status
Accepted.

## Context
Qualyntra needs to publish release quality to source-control/CI systems and create defects/work items without allowing GitHub, Azure DevOps, Jira, or Jenkins libraries to become dependencies of governance or the control plane. External mutations also introduce duplicate-side-effect, credential-leak, rate-limit, and audit risks.

## Decision
Enterprise systems implement the existing `IntegrationAdapter` contract under `adapters/integrations`. Adapters receive configurable base URLs and `SecretReference` credentials, obey `NetworkPolicy`, and use an injectable vendor-neutral HTTP transport. The platform retries mutations only when they are explicitly idempotent and supports an injectable dedupe store. Integration execution writes minimal secret-safe audit metadata.

Webhook signature verification is a separate `WebhookVerifier` boundary. HMAC-SHA256 is supplied as a reusable implementation; vendor-specific schemes can add adapters without changing the integration contract.

## Consequences
- GitHub/Azure DevOps/Jira/Jenkins SDK upgrades cannot force changes into protected platform packages.
- Self-hosted/enterprise endpoints use the same adapters as cloud deployments.
- Credentials stay in secret providers instead of integration requests or persisted configuration payloads.
- Duplicate-sensitive actions require an idempotency key and can later use a durable dedupe store.
- Additional integrations and richer vendor features can be added without redesigning governance or the control plane.
