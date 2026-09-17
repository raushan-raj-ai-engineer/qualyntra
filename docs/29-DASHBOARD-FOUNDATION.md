<!--
File: docs/29-DASHBOARD-FOUNDATION.md
Purpose: Defines the first customer-facing Qualyntra dashboard architecture, security model, information design, and deployment boundary.
Author: Raushan Raj
-->

# Dashboard / Product UI Foundation

## Goal

Provide a real product UI without allowing the browser to become a privileged integration client. The dashboard is a thin tenant-aware presentation layer over the authenticated Qualyntra control plane.

## Architecture

```text
Browser SPA
   |
   | same origin only
   v
Dashboard BFF  ---- server-side session resolver
   |
   | authenticated /api/v1 requests
   v
Control Plane
   |
   +-- governance / persistence / distributed execution
   +-- artifact service
   +-- integrations / model providers / runners
```

The browser never receives database credentials, cloud-storage credentials, integration tokens, LLM API keys, or the local dashboard bootstrap token.

## Session model

`DashboardSessionResolver` is intentionally injectable. Enterprise deployments can resolve an opaque HttpOnly session cookie created by their OIDC/BFF login flow. The repository also includes a bootstrap service-token resolver strictly for local development and smoke testing.

A production deployment should not use the bootstrap resolver as a human-user authentication mechanism because it represents one server-side service identity rather than the signed-in user.

## Browser data flow

The SPA sends tenant headers selected in the workspace bar and a fresh correlation ID. It never sends an upstream bearer credential itself. Requests use `credentials: same-origin` so an enterprise BFF session cookie can be used without exposing its server-side authorization material to JavaScript.

## Product views

The first shell provides Overview, Runs, AI Evaluation, Releases, Workers, Artifacts, Integrations, Audit, and Settings views. Existing `/api/v1` endpoints power the available read models. Worker lease/heartbeat and artifact metadata pages deliberately stop at the control-plane boundary until dedicated APIs are published; the browser does not bypass that gap by connecting to queues or object stores.

## Security controls

- Same-origin BFF proxy.
- Allowlisted proxied API prefix and request/response headers.
- HTTPS required for non-loopback control-plane origins.
- Request-body and upstream-response size limits.
- Cross-site mutation rejection using `Sec-Fetch-Site`/`Origin` when supplied by browsers.
- CSP with no inline or remote scripts.
- `frame-ancestors 'none'` plus `X-Frame-Options: DENY`.
- No credential persistence in Web Storage.
- DOM/text rendering for untrusted server values.
- No remote fonts, analytics, CDNs, or third-party browser SDKs.
- Safe generic 5xx responses from the dashboard server.

## Accessibility and resilience

The shell uses semantic navigation/main regions, a keyboard-accessible skip link, focus-visible states, labelled tenant fields, status/live regions, horizontal table scrolling, responsive layouts, explicit loading states, empty states, and surfaced correlation IDs for API failures.

## Build

The browser code has a dedicated ES-module TypeScript configuration. It intentionally uses platform Web APIs instead of introducing a frontend framework dependency at this foundation stage. This keeps the UI architecture replaceable while the information model and security boundary stabilize.
