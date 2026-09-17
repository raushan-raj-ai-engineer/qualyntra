<!--
File: docs/25-ENTERPRISE-IDENTITY.md
Purpose: Documents Qualyntra enterprise OIDC/JWT identity, tenant claim mapping, service identities, and security boundaries.
Author: Raushan Raj
-->

# Enterprise Identity / OIDC / SSO Foundation

Qualyntra now supports vendor-neutral enterprise bearer authentication through OpenID Connect discovery and signed JWT verification. The platform does not import Azure AD/Entra ID, Okta, Auth0, Keycloak, or another identity-vendor SDK. A configured issuer is discovered through OIDC metadata, signing keys are read through JWKS, and verified claims are converted into the same `ActorIdentity`/RBAC model used by the control plane.

## Security model

- Only preconfigured issuers are eligible. An unverified `iss` claim can select only from that preconfigured set and can never choose an arbitrary network destination.
- OIDC discovery metadata must return an issuer that exactly matches configuration.
- Discovery and JWKS traffic is still subject to Qualyntra's deny-by-default outbound network policy and host allowlist.
- HTTPS is required, except explicitly enabled localhost development.
- URLs with embedded credentials are rejected.
- JWT algorithms are explicitly allowlisted (`RS256` and/or `ES256`); `none` and algorithm switching are rejected.
- JWT `kid` is required and signing keys must match the selected algorithm/key type. Unknown `kid` performs one forced JWKS refresh to support normal key rotation.
- Signature, issuer, audience, expiration, `nbf`, future `iat`, optional maximum token age, token type, and required claims are validated before claims are used.
- Token contents are not persisted as platform records. `ApiPrincipal.identity` contains only issuer/subject/expiry/token-id metadata.
- Tenant RBAC assignments come only from **verified** claims plus configured group-to-role mappings.

The JWT rules follow the security direction of RFC 7519 and RFC 8725: applications explicitly define accepted algorithms and claims rather than trusting token-selected algorithms or ambiguous token contexts.

## Tenant and role mapping

A deployment selects claim names instead of Qualyntra hardcoding an IdP vocabulary:

```text
organization claim -> TenantScope.organizationId
workspace claim    -> TenantScope.workspaceId (optional)
project claim      -> TenantScope.projectId   (optional)
environment claim  -> TenantScope.environmentId (optional)
group claim        -> configured group-to-role mappings
```

For example, a verified `qa-admin` group can map to Qualyntra's `platform-admin` role. The resulting assignment is scoped to the organization/workspace/project/environment derived from the same verified token. A request that supplies a different `x-qualyntra-organization-id` therefore fails existing RBAC checks.

A verified subject can also be explicitly listed as a service identity. No regular-expression subject matching is used by the default mapper.

## Bootstrap and enterprise authentication together

The local control-plane app composes the existing static bootstrap bearer authenticator with optional OIDC authentication. This lets private deployments preserve an emergency/bootstrap service path while introducing enterprise SSO gradually. Production operators can disable the bootstrap token by simply not configuring it.

## Configuration

The `.env.example` documents the optional OIDC settings. Important values include:

- `QUALYNTRA_OIDC_ISSUER`
- `QUALYNTRA_OIDC_AUDIENCES`
- `QUALYNTRA_OIDC_ALLOWED_ALGORITHMS`
- `QUALYNTRA_OIDC_ROLE_MAPPINGS` (`group=role` pairs)
- tenant claim names
- token/JWKS timeout and cache bounds

Outbound identity traffic additionally requires `QUALYNTRA_ALLOW_NETWORK=true` and a suitable `QUALYNTRA_ALLOWED_HOSTS` allowlist.

## Multi-issuer support

`MultiIssuerOidcAuthenticator` supports multiple preconfigured enterprise issuers. Each issuer owns its verifier and claim-mapping policy. This allows an organization to onboard separate workforce/service identity domains without allowing a token to invent a new issuer configuration at runtime.

## What this feature does not claim

This is the server-side enterprise identity foundation for the Qualyntra API. It is not yet a browser login/BFF implementation and does not add SAML, SCIM provisioning, MFA policy ownership, or browser session cookies. A dashboard should later use an authorization-code/PKCE or BFF pattern appropriate to the deployment rather than storing long-lived bearer tokens in browser storage.
