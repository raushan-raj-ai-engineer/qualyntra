# ADR 0024: Runtime state is shared through PostgreSQL adapters

<!-- Purpose: Records why Qualyntra uses PostgreSQL adapter implementations for durable scheduler, artifact metadata, telemetry, and alert state while keeping platform contracts vendor-neutral. -->
<!-- Author: Raushan Raj -->

## Status

Accepted.

## Context

The initial distributed queue, artifact catalog, telemetry store, and alert state were intentionally in-memory reference implementations. That made local development simple but prevented reliable restart recovery and safe multi-control-plane operation. Introducing a queue vendor directly into core packages would weaken the existing vendor-neutral architecture and create another operational dependency before the product requires it.

## Decision

Qualyntra will keep the existing storage-neutral contracts and provide PostgreSQL implementations in `adapters/persistence/postgres`.

Distributed leasing uses database transactions and row locking with `SKIP LOCKED`. Artifact bytes remain outside PostgreSQL behind artifact-storage adapters. Telemetry records are redacted before persistence. Alert cooldown claims are atomic database operations so multiple replicas cannot trigger the same cooldown window concurrently.

The control-plane application owns backend composition and selects memory or PostgreSQL through deployment configuration. Core packages do not import a PostgreSQL driver.

## Consequences

Positive:

- restart recovery for execution and operational state;
- one transactional consistency boundary for current durable control-plane data;
- no additional queue vendor is required;
- multi-instance lease ownership can be made database-atomic;
- artifact/object-store concerns remain separated from metadata persistence;
- local tests retain fast in-memory implementations.

Tradeoffs:

- PostgreSQL becomes an operational dependency for durable mode;
- high-volume telemetry may eventually move to specialized stores while preserving the same telemetry contracts;
- shared object storage is still required for true multi-replica artifact-byte access;
- the optional `pg` driver must be included by deployments that enable PostgreSQL mode.

## Rejected alternatives

- hard-code Redis/RabbitMQ/Kafka into distributed execution core;
- keep lease ownership in process memory and rely on sticky routing;
- store binary artifacts directly in PostgreSQL;
- make the browser/dashboard responsible for backend selection;
- enable multi-replica control-plane defaults before shared state is configured.
