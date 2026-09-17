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

### Enterprise identity foundation now implemented

- Standards-based OIDC discovery and JWKS validation.
- Explicit JWT algorithm, issuer, audience and lifetime verification.
- Multi-issuer authentication from a preconfigured issuer set only.
- Tenant claim mapping plus configured group-to-role assignments.
- Explicit service identities and composable bootstrap bearer authentication.

See `25-ENTERPRISE-IDENTITY.md`.

### Enterprise integrations now implemented

- GitHub, Azure DevOps, Jira, and Jenkins adapters remain outside protected platform packages.
- Credentials are resolved from `SecretReference` values; URLs with embedded credentials are rejected.
- Outbound calls obey the existing deny-by-default network policy.
- Duplicate-sensitive mutations require idempotency keys and support injectable dedupe persistence.
- Retry behavior is bounded and enabled only for explicitly idempotent mutations.
- Integration audit evidence excludes request payloads and secret values.
- HMAC-SHA256 webhook verification is provided through a vendor-neutral verifier boundary.

See `26-ENTERPRISE-INTEGRATIONS.md`.

### Required before broad commercial deployment

The v1.0 codebase establishes extension points but production SaaS/on-prem distribution should still add independently reviewed browser SSO/BFF flows where needed, optional SAML/SCIM, ABAC, audit-log WORM/retention options, encryption/KMS/BYOK, retention/deletion policies, signed artifacts, SBOM/provenance, vulnerability scanning, license scanning, backup/restore, HA/DR and formal threat modeling.

These are productization work items, not hidden assumptions. See `10-COMMERCIAL-READINESS.md`.


## Control-plane API

Protected `/api/v1` routes require authentication, explicit tenant context, and governance RBAC. The bootstrap bearer token is environment-supplied and can now be composed with the vendor-neutral OIDC/JWT enterprise authenticator. API requests are body-limited, rate-limited, correlation-tagged, and returned through stack-free error envelopes. Raw run environment values are rejected in favor of secret references.
## Artifact evidence security

Artifact bytes are addressed only by Qualyntra-generated opaque tenant-scoped keys. Uploads are size-bounded and SHA-256 hashed, metadata is redacted before persistence, verified downloads fail on integrity mismatch, remote stores obey egress policy, and temporary download grants are HTTPS-only and bounded by configured TTL. Cloud credentials/signing remain deployment-owned adapter concerns. See `28-ARTIFACT-STORAGE.md`.
