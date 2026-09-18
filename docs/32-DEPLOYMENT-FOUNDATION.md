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

## Current durability boundary

This milestone packages the existing reference composition; it does not pretend the in-memory distributed queue, telemetry store, alert state, or artifact metadata catalog are production durable. The PostgreSQL persistence adapter already exists for control-plane records, and cloud artifact adapter boundaries already exist, but production composition of all durable backends should be completed in a dedicated durable-runtime-backends milestone before production certification.

Do not horizontally scale the current reference control-plane stateful composition merely because the chart permits replica configuration. For production HA, wire durable shared queue/catalog/telemetry backends first. The chart therefore defaults the control plane to one replica with its HPA and disruption budget disabled. Those controls remain templated for activation only after durable shared backends are wired.

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
