<!--
File: apps/dashboard/README.md
Purpose: Documents the secure dashboard application, browser/BFF boundary, build, configuration, and supported product views.
Author: Raushan Raj
-->

# Qualyntra Dashboard

The dashboard is a dependency-light TypeScript SPA served by a Node BFF boundary. Browser code talks only to same-origin `/dashboard-api/api/v1/*`; it does not connect directly to PostgreSQL, workers, object storage, LLM providers, GitHub, Azure DevOps, Jira, Jenkins, or another vendor system.

## Security boundary

- Backend credentials are resolved server-side through `DashboardSessionResolver`.
- Browser code does not use `localStorage` or `sessionStorage` for credentials.
- The default enterprise extension point is an opaque HttpOnly cookie resolved through `CookieDashboardSessionResolver`.
- `QUALYNTRA_DASHBOARD_BOOTSTRAP_TOKEN` is an explicit local-development mode only. The token never appears in dashboard runtime configuration or JavaScript.
- The dashboard BFF forwards only an allowlisted set of headers and API paths.
- Remote control-plane origins must use HTTPS; HTTP is accepted only for loopback development.
- CSP, frame denial, referrer, permissions, COOP, CORP and MIME-sniffing defenses are emitted by the dashboard server.
- Dynamic API data is rendered with DOM/text nodes, not injected as HTML.

## Build and run

```bash
npm run build
npm run dashboard
```

The default dashboard endpoint is `http://127.0.0.1:4320` and the default local control-plane endpoint is `http://127.0.0.1:4317`. Override both through environment configuration for deployments.

## Initial views

- Overview
- Runs
- AI Evaluation
- Releases
- Workers/runtime capabilities
- Artifacts boundary
- Integrations
- Audit
- Settings/capabilities

Worker and artifact metadata are intentionally not read directly from their backends. Dedicated tenant-authorized control-plane read APIs can be added later without weakening the UI boundary.
