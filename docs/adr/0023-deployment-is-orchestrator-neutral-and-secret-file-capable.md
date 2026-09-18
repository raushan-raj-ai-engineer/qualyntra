# ADR 0023: Deployment is orchestrator-neutral and secret-file capable

<!-- Purpose: Records why Docker/Kubernetes concerns stay outside the core and why orchestrated credentials support file mounts. -->
<!-- Author: Raushan Raj -->

## Status

Accepted.

## Decision

Qualyntra platform packages remain independent of Docker, Kubernetes, Helm, cloud load balancers, and cluster-specific APIs. Deployment assets live under `deploy/` and compose already-defined process boundaries.

Control-plane, dashboard bootstrap, and execution-agent bearer credentials support file-mounted secret sources. The control plane accepts a distinct execution-agent credential mapped to the least-privilege `execution-agent` role. Local environment-token configuration remains available for development compatibility.

The chart uses non-root workloads, read-only roots, explicit writable volumes, disabled service-account token automount, runtime-default seccomp, dropped Linux capabilities, health probes, resource budgets, disruption controls, and network policies.

## Consequences

Operators can use native Kubernetes Secrets, CSI secret mounts, Docker secrets, or another orchestrator mechanism without teaching core packages about that system. Rotation can be observed by file-backed authenticators without embedding credentials in images or checked-in manifests.

Durable queue/catalog/telemetry production composition remains a separate milestone; deployment manifests must not imply that existing in-memory reference stores are durable merely because they run in containers.
