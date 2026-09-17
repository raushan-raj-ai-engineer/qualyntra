<!--
File: docs/adr/0020-dashboard-uses-same-origin-bff-and-credential-free-browser.md
Purpose: Records the decision to keep dashboard credentials and privileged backend access behind a same-origin server boundary.
Author: Raushan Raj
-->

# ADR 0020: Dashboard uses a same-origin BFF and credential-free browser

## Status

Accepted.

## Context

Qualyntra already has enterprise OIDC identity, tenant RBAC, integrations, distributed execution, persistence, and artifact storage. A browser dashboard must not weaken those controls by embedding service credentials, cloud tokens, database access, or vendor SDKs in client code.

## Decision

The dashboard is served with a same-origin Backend-for-Frontend boundary. Browser requests target `/dashboard-api/api/v1/*`. The BFF obtains upstream authorization through an injectable `DashboardSessionResolver` and forwards only allowlisted headers to a preconfigured control-plane origin.

The browser stores tenant selection only in memory and does not persist authentication material in Web Storage. Production identity integrations should use opaque HttpOnly sessions or an equivalent server-managed mechanism. The provided bootstrap token resolver is local-development support, not production human authentication.

The first SPA is implemented with standards-based TypeScript and DOM APIs. Choosing React, another UI framework, or a design system later must not change the BFF/control-plane trust boundary.

## Consequences

- Browser compromise cannot directly reveal Qualyntra service/vendor credentials that were never delivered to the browser.
- Enterprise identity can evolve independently from UI components.
- A separate dashboard server or ingress route is required.
- Dedicated control-plane read APIs must be added before the UI can display worker lease internals or artifact catalog data; direct backend shortcuts are prohibited.
