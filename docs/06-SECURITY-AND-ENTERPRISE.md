<!--
File: docs/06-SECURITY-AND-ENTERPRISE.md
Purpose: Defines security defaults and enterprise controls required before external commercialization.
Author: Raushan Raj
-->

# Security and Enterprise Controls

### Implemented baseline

- Outbound network access defaults to **disabled**.
- Optional destination allowlist.
- Credentials are not part of committed configuration.
- Recursive redaction helper for logs/results.
- Prompt persistence defaults to disabled.
- Adapter health/status separates unavailability from test failure.
- Local control-plane binds to `127.0.0.1` by default.

### Enterprise governance foundation now implemented

- Tenant-scoped deny-by-default RBAC contracts and services.
- Evidence-backed release policies with approvals and expiring scoped exceptions.
- Tamper-evident chained audit records with sensitive metadata redaction.
- Secret-reference/resolver boundary so raw values stay outside persisted configuration contracts.
- Vendor-neutral integration contracts through the central adapter registry.

See `22-ENTERPRISE-GOVERNANCE.md`.

### Required before broad commercial deployment

The v1.0 codebase establishes extension points but production SaaS/on-prem distribution should add independently reviewed implementations for SSO (OIDC/SAML), RBAC/ABAC, tenant isolation, audit-log persistence/WORM options, encryption/KMS/BYOK, retention/deletion policies, signed artifacts, SBOM/provenance, vulnerability scanning, license scanning, backup/restore, HA/DR, rate limiting, API authentication, database migrations and formal threat modeling.

These are productization work items, not hidden assumptions. See `10-COMMERCIAL-READINESS.md`.


## Control-plane API

Protected `/api/v1` routes require authentication, explicit tenant context, and governance RBAC. The bootstrap bearer token is environment-supplied; production identity remains replaceable by an OIDC/SSO authenticator. API requests are body-limited, rate-limited, correlation-tagged, and returned through stack-free error envelopes. Raw run environment values are rejected in favor of secret references.
