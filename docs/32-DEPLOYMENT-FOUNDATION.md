# Qualyntra Deployment Foundation

<!-- Purpose: Documents secure container, Docker Compose, Kubernetes, and Helm deployment boundaries for Qualyntra. -->
<!-- Author: Raushan Raj -->

## Scope

This foundation packages the control plane, dashboard BFF, and execution agent as separate deployable processes. Deployment configuration remains outside platform-kernel packages; Kubernetes and Docker are orchestration choices, not core dependencies.

## Security baseline

Production images run as the non-root `qualyntra` user. Helm workloads disable privilege escalation, drop Linux capabilities, use `RuntimeDefault` seccomp, disable automatic Kubernetes service-account token mounts, expose health/readiness probes, and use read-only root filesystems with explicit writable volumes.

Control-plane bootstrap and execution-agent bearer credentials may be mounted as files through `QUALYNTRA_API_TOKEN_FILE` and `QUALYNTRA_AGENT_API_TOKEN_FILE`. The dashboard supports `QUALYNTRA_DASHBOARD_BOOTSTRAP_TOKEN_FILE`. Environment-token options remain for local development, but file-mounted secrets are preferred for orchestrated deployments.

The agent uses a separate `execution-agent` role credential rather than the platform-administrator bootstrap token. This limits the worker credential to `execution.worker` operations.

## Images

- `deploy/docker/control-plane.Dockerfile` packages the API and local reference evidence directory.
- `deploy/docker/dashboard.Dockerfile` packages the dashboard/BFF and compiled browser assets.
- `apps/agent/Dockerfile` remains the generic worker-agent base. Runner-specific production images should extend it with the required browser/JVM/Python/native dependencies.

## Docker Compose

`deploy/compose/docker-compose.yml` is a hardened developer/reference topology. It binds public ports to loopback, marks container roots read-only, drops capabilities, applies `no-new-privileges`, adds tmpfs for temporary files, waits for service health, and keeps agent startup behind the `agent` profile.

Example:

```bash
cp deploy/compose/.env.example deploy/compose/.env
# Fill tokens and organization ID outside source control.
docker compose --env-file deploy/compose/.env -f deploy/compose/docker-compose.yml up --build
```

Enable the optional generic agent with `--profile agent` after selecting/installing a usable runner image.

## Helm

The chart is under `deploy/helm/qualyntra`. Important operator inputs are intentionally empty by default: organization ID, bootstrap secret name, agent secret name, ingress hostname, and TLS secret. Helm should fail operationally rather than ship sample production credentials.

The chart includes:

- rolling updates;
- startup/liveness/readiness probes;
- CPU/memory requests and limits;
- control-plane/dashboard HPAs;
- PodDisruptionBudgets;
- persistent reference data volume for the control plane;
- isolated ephemeral agent workspace/data volumes;
- default-deny NetworkPolicy with explicit internal application/DNS flows;
- optional TLS ingress exposing only the dashboard;
- service-account token automount disabled.

## Runtime durability boundary

The durable-runtime-backends milestone adds PostgreSQL implementations for the distributed queue, worker registry, artifact metadata catalog, telemetry, and alert state. The deployment still defaults to `QUALYNTRA_RUNTIME_BACKEND=memory` so local/reference startup has no hidden database requirement.

Do not horizontally scale the control plane merely because PostgreSQL mode exists. For production HA, configure the shared PostgreSQL backend, include the optional PostgreSQL driver in the runtime image, and use shared artifact-byte storage rather than replica-local filesystem bytes. The chart therefore continues to default the control plane to one replica with its HPA and disruption budget disabled. Those controls may be enabled only after all shared-state conditions documented in `33-DURABLE-RUNTIME-BACKENDS.md` are satisfied.

## Validation

Always run:

```bash
npm run release:validate
node scripts/validate-deployment.mjs
git diff --check
```

When installed locally, also run:

```bash
docker compose -f deploy/compose/docker-compose.yml config
helm lint deploy/helm/qualyntra
helm template qualyntra deploy/helm/qualyntra
```
