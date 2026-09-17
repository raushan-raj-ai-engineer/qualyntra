<!--
File: docs/22-ENTERPRISE-GOVERNANCE.md
Purpose: Documents Qualyntra enterprise governance foundations for authorization, tenancy, auditability, release policy, secrets, and integrations.
Author: Raushan Raj
-->

# Enterprise Governance

Qualyntra governance is deliberately vendor-neutral and deny-by-default. It is a foundation for private deployment, SaaS tenancy, CI/CD release gates, and regulated environments; it is not a claim that SSO/KMS/WORM storage are already production-certified.

## Implemented in this feature

- Hierarchical organization → workspace → project → environment scopes.
- RBAC permissions and scoped role assignments with deny-by-default decisions.
- Append-only in-memory audit records chained with SHA-256 hashes and recursive sensitive-field redaction.
- Evidence-backed release policies with explicit `PASS`, `FAIL`, or `REVIEW_REQUIRED` decisions.
- Blocking and review-only rules, distinct approvals, and expiring scoped exceptions.
- Secret references plus pluggable resolvers; raw values are resolved only at use time.
- Vendor-neutral integration operations executed through the central adapter registry.
- Portable JSON schemas for release policies and integration requests.

## Deliberate boundaries

The current audit store is an in-process tamper-evident implementation for contracts/tests. Commercial deployment still needs a durable database/object-store implementation and, where required, WORM/retention controls. OIDC/JWT enterprise identity is now implemented as a vendor-neutral identity package. Browser SSO/BFF, optional SAML/SCIM, KMS/BYOK, external policy stores, and vendor-specific Jira/GitHub/Azure/Jenkins integrations should remain adapters/features built on these contracts.

## Release-policy example

A production policy can require `criticalFailures == 0`, LLM quality `>= 0.90`, security evidence to exist, and two approvals. The decision always returns the exact rules, facts/evidence references, exceptions, and approval counts that determined the status; Qualyntra does not replace these facts with an opaque aggregate score.
