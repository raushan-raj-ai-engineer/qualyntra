<!--
File: docs/adr/0022-execution-agent-uses-remote-leases-and-isolated-workspaces.md
Purpose: Records the decision to package distributed execution as a tenant-scoped remote worker with lease ownership and isolated local workspaces.
Author: Raushan Raj
-->

# ADR 0022: Execution agent uses remote leases and isolated workspaces

## Status

Accepted.

## Decision

The deployable execution node is a standalone agent that communicates with the Control Plane through an authenticated tenant-aware HTTP worker protocol. The agent does not connect directly to the Control Plane's queue/database implementation. Runner execution remains adapter-driven through `AdapterRegistry`.

Each attempt receives an isolated local workspace. Persisted distributed requests may contain secret references but not raw environment secrets; references are resolved only in the agent process after lease acquisition. Worker identity is stable across restarts but contains no credential material.

The base container runs as a non-root user and does not bundle every possible test runtime. Purpose-built derived images can add runtime/tooling while preserving the same agent protocol.

## Consequences

- Queue technology can change without changing execution-agent protocol semantics.
- Tenant and lease authorization are enforced centrally.
- Workers can be horizontally scaled and independently upgraded.
- Stale workers cannot complete work after losing a lease.
- Local disk and path confinement become explicit security boundaries.
- Deployment-specific runner images remain smaller and easier to certify.
- Durable queue persistence, signed plugin loading, SCM workspace materialization, and stronger process sandboxing can evolve independently.
