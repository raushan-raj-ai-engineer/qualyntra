<!--
File: docs/31-EXECUTION-AGENT-PACKAGING.md
Purpose: Documents the standalone execution agent, secure worker protocol, isolated workspaces, secret materialization, health lifecycle, and container packaging.
Author: Raushan Raj
-->

# Execution Agent Packaging

Qualyntra's execution agent turns the vendor-neutral distributed execution contracts into a separately deployable worker process. The agent never owns scheduling policy or tenant authorization: it registers capabilities with the authenticated Control Plane, leases only work allowed for its tenant scope, renews leases during execution, and reports completion/failure through the worker protocol.

## Architecture

```text
Control Plane
   |
   | authenticated /api/v1 agent protocol
   v
Execution Agent
   |- stable generated worker identity
   |- adapter-derived capabilities
   |- lease polling + heartbeat
   |- isolated per-job workspace
   |- ephemeral secret resolution
   |- runner AdapterRegistry
   |- artifact upload
   |- health / readiness
   `- telemetry
```

The agent core depends on `AdapterRegistry`, distributed contracts, and runner-neutral execution contracts. Runner-specific composition lives only at the application boundary in `apps/agent/src/builtins.ts`.

## Authentication and tenancy

- `QUALYNTRA_AGENT_ORGANIZATION_ID` is required.
- Workspace/project/environment scope follows the same hierarchy used by governance. A project cannot be configured without a workspace; an environment cannot be configured without a project.
- Production deployments should use `QUALYNTRA_AGENT_TOKEN_FILE`, typically a mounted secret. The file is reread for every request so rotation does not require restarting the worker.
- `QUALYNTRA_AGENT_TOKEN` exists for controlled local development only and is never written to the worker identity file, workspace, telemetry, or artifact metadata.
- The built-in `execution-agent` role grants only `execution.worker`.
- Worker and lease operations are rechecked against the request tenant scope on the Control Plane; knowing another worker/job identifier is not sufficient to operate it.

## Secrets inside test jobs

Distributed jobs continue to reject persisted raw `ExecutionRequest.env` values. The agent resolves `secretRefs` only after it owns a lease:

- `agent-file` reads a named secret beneath `QUALYNTRA_AGENT_SECRET_ROOT` (default `/run/secrets`).
- `agent-env` is disabled by default and becomes available only when `QUALYNTRA_AGENT_ALLOW_ENV_SECRETS=true`.

Resolved values exist only in the in-memory runner request. The durable distributed job keeps the secret reference, not the secret value.

## Workspaces and evidence

Every leased job receives an isolated `job_*` directory beneath `QUALYNTRA_AGENT_WORKSPACE_ROOT`. Result-file paths are confined to that directory, symbolic links are rejected during size validation, and total output is bounded by `QUALYNTRA_AGENT_MAX_WORKSPACE_BYTES`. Workspaces are deleted after the attempt by default.

Runner `resultFiles` are uploaded through the authenticated Control Plane artifact endpoint. Artifact publication is best-effort at this foundation stage: uploaded artifact IDs and upload failures are attached to execution-result metadata so evidence failure is visible without automatically rerunning an otherwise completed test command.

### Reference deployment limitation

The bundled `apps/control-plane` composition is intentionally a local/reference deployment: its distributed queue and artifact metadata catalog are currently in memory. Artifact bytes written by the local storage adapter can survive process restart, but their in-memory catalog and queued/leased jobs do not. Production deployment therefore still requires durable distributed-queue/catalog implementations behind the existing contracts; the agent protocol itself does not depend on the in-memory implementations.

## Lifecycle and failure recovery

- Registration advertises only runner adapters whose health is not `unavailable`.
- Scheduler capabilities include languages discovered from adapter descriptors plus operator-configured languages, engines, labels, and host operating system.
- Agent polling respects worker concurrency and uses the distributed queue's lease ownership rules.
- Lease keepalive runs independently while a runner is active.
- `SIGINT`/`SIGTERM` switch the worker to `draining`, stop new leases, wait up to `QUALYNTRA_AGENT_SHUTDOWN_GRACE_MS`, then exit. If a process is terminated after that grace period, the existing lease-expiry recovery path requeues/dead-letters the job according to attempt policy.
- `/health` and `/ready` expose only liveness/readiness. Detailed runtime state is intentionally not exposed by the local health server.

## Built-in runner composition

`QUALYNTRA_AGENT_RUNNERS` selects adapters at startup. Supported built-in composition keys are currently `custom-process`, `cypress`, `junit-console`, `playwright-test`, `pytest`, `testng`, and `webdriverio`. This list is composition only; scheduling/execution logic does not branch by runner type.

Additional packaging can later load signed adapter bundles without changing the agent lifecycle.

## Container image

`apps/agent/Dockerfile` uses a Node 22 build stage and a minimal Node 22 runtime stage. The runtime:

- runs as the non-root `qualyntra` user;
- contains compiled platform/agent code but no source-control metadata or local secret files;
- exposes port `4321` for health/readiness;
- uses a localhost healthcheck;
- expects runner tooling (browsers, Java, Python, mobile SDKs, etc.) to be added by purpose-built derived images rather than bloating the base agent image.

Example build:

```bash
docker build -f apps/agent/Dockerfile -t qualyntra-agent:local .
```

## Local configuration example

```bash
export QUALYNTRA_AGENT_CONTROL_PLANE_ORIGIN=http://127.0.0.1:4317
export QUALYNTRA_AGENT_ORGANIZATION_ID=org-local
export QUALYNTRA_AGENT_TOKEN_FILE=/run/secrets/qualyntra-agent-token
export QUALYNTRA_AGENT_RUNNERS=pytest
npm run agent
```

Do not commit a real token file or copy it into the image.
