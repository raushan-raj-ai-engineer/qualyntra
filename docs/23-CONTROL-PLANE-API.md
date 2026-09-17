<!--
Purpose: Documents the authenticated versioned Qualyntra control-plane API, tenancy, safety boundaries, repositories, and operational usage.
Author: Raushan Raj
-->
# Qualyntra Control Plane API

Qualyntra exposes a dependency-light `/api/v1` HTTP control plane so CI systems, dashboards, workers, and customer integrations can operate the platform without importing internal TypeScript modules.

## Security model

`/api/v1/health` and `/api/v1/ready` are public probe endpoints. Every business endpoint requires bearer authentication plus `x-qualyntra-organization-id`; optional workspace, project, and environment headers narrow the tenant scope. Authorization is deny-by-default through the governance RBAC service.

The bootstrap server reads `QUALYNTRA_API_TOKEN`, `QUALYNTRA_API_ACTOR_ID`, and `QUALYNTRA_API_ORGANIZATION_ID` from the environment. This remains a bootstrap authenticator; deployments can now compose it with the standards-based OIDC/JWT enterprise authenticator documented in `25-ENTERPRISE-IDENTITY.md`. Raw API tokens are never stored in platform records or audit metadata.

Control-plane run requests reject persisted raw `env` values. Execution secrets must be expressed as `secretRefs`, preserving the governance rule that the platform stores references rather than plaintext secrets.

## Operational safeguards

- Server-generated UUID-backed request, correlation, run, audit, and decision identifiers.
- Bounded JSON bodies and bounded pagination.
- Fixed-window rate-limit boundary with `Retry-After` responses.
- CORS is deny-by-default and reflects only explicitly configured origins.
- Structured error envelopes never return internal stack traces.
- Run creation supports `Idempotency-Key`; reusing a key with a different request returns conflict.
- Adapter discovery reads descriptors only and does not call health checks, preventing unexpected network activity.
- Audit results are filtered through hierarchical tenant scope.
- In-memory repositories implement storage contracts only; database choice is deferred to the persistence feature.

## API areas

| Area | Endpoints |
| --- | --- |
| Probes | `/api/v1/health`, `/api/v1/ready` |
| Platform | `/api/v1/capabilities`, `/adapters`, `/runtimes`, `/providers`, `/integrations` |
| Runs | `/api/v1/runs`, `/api/v1/runs/{id}`, `/api/v1/runs/{id}/results` |
| Evaluations | `/api/v1/evaluations`, `/api/v1/evaluations/{id}` |
| Governance | `/api/v1/policies`, `/api/v1/releases/{id}/decision`, `/api/v1/audit` |
| Integrations | `/api/v1/integrations/{id}/actions` |

The machine-readable contract is `schemas/control-plane-api.openapi.json`.

## Local bootstrap

Set at minimum:

```text
QUALYNTRA_API_TOKEN=<secret supplied outside source control>
QUALYNTRA_API_ORGANIZATION_ID=<organization id>
```

Optional API limits are `QUALYNTRA_API_MAX_BODY_BYTES`, `QUALYNTRA_API_MAX_PAGE_SIZE`, `QUALYNTRA_API_RATE_LIMIT_PER_MINUTE`, and `QUALYNTRA_API_CORS_ORIGINS`.

The local reference server intentionally uses in-memory repositories. Durable persistence and OIDC/JWT enterprise authentication are now adapter-based features; distributed workers and browser-oriented SSO/session flows remain separate features rather than hidden assumptions in this API layer.
