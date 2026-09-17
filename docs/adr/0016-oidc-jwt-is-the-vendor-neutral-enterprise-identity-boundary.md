<!--
File: docs/adr/0016-oidc-jwt-is-the-vendor-neutral-enterprise-identity-boundary.md
Purpose: Records the decision to use standards-based OIDC discovery/JWKS verification and verified-claim mapping as the enterprise identity boundary.
Author: Raushan Raj
-->

# ADR 0016: OIDC/JWT is the vendor-neutral enterprise identity boundary

## Status
Accepted.

## Context
Qualyntra needs enterprise SSO without embedding Azure AD/Entra ID, Okta, Auth0, Keycloak, or another provider's SDK in the control plane. Identity must also preserve tenant isolation and the existing deny-by-default governance model.

## Decision
Qualyntra will authenticate enterprise API bearer tokens through preconfigured OIDC issuers, OIDC discovery, JWKS signature verification, explicit JWT algorithm/audience/lifetime checks, and configurable verified-claim mapping into `ActorIdentity` and `TenantScope`.

An unverified issuer claim may select only a statically configured issuer entry; it never becomes a discovery URL. Network access remains governed by the platform network policy. Group-to-role mappings are configuration, not token-provided role names.

The existing static bearer authenticator remains a composable bootstrap mechanism rather than being removed or silently upgraded into an enterprise identity system.

## Consequences
- Identity vendors can change without changing governance or API contracts.
- Key rotation works through controlled JWKS refresh.
- Cross-tenant requests remain governed by the same RBAC code path for bootstrap and OIDC identities.
- Browser SSO/BFF, SAML, SCIM, and provider-specific provisioning remain separate future adapters/features.
