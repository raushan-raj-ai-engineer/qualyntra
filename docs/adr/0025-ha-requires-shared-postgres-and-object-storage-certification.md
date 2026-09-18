<!--
File: docs/adr/0025-ha-requires-shared-postgres-and-object-storage-certification.md
Purpose: Records why Qualyntra enables multi-control-plane operation only after live shared-state and restart-recovery certification.
Author: Raushan Raj
-->
# ADR 0025: HA requires shared PostgreSQL and object-storage certification

## Status

Accepted.

## Context

Multiple Control Plane replicas are unsafe when queue state, artifact bytes, telemetry, alert cooldowns, idempotency, or leases are process-local. Static SQL tests are necessary but cannot prove database lock arbitration or restart behavior.

## Decision

Qualyntra treats HA as a separately certified deployment mode. Shared PostgreSQL is the authoritative runtime-state boundary. Artifact bytes must use shared object storage. Atomic run idempotency is implemented at the repository insert boundary, distributed leasing uses PostgreSQL row locks with `SKIP LOCKED`, and expired leases are recovered after restart.

The live certification topology starts two Control Plane replicas, PostgreSQL, and an S3-compatible test endpoint. It proves cross-replica idempotency, artifact verification, lease exclusivity, and restart recovery before HA deployment defaults can be enabled.

Vendor SDKs remain confined to adapters. PostgreSQL and S3 runtime credentials are resolved from mounted secret files.

## Consequences

Memory runtime backends and local artifact files remain development/reference modes and must not be horizontally scaled. Production operators can use equivalent managed PostgreSQL and S3-compatible services, but environment-specific certification is still required.
