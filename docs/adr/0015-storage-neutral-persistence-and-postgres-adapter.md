<!--
File: docs/adr/0009-storage-neutral-persistence-and-postgres-adapter.md
Purpose: Records the decision to keep persistence contracts vendor-neutral while shipping PostgreSQL as an optional durable adapter.
Author: Raushan Raj
-->
# ADR 0009: Storage-neutral persistence with PostgreSQL adapter

## Status
Accepted.

## Decision
The control plane will depend on repository and audit interfaces, not on PostgreSQL libraries. PostgreSQL is implemented in an adapter with a minimal injectable driver boundary. The `pg` package is loaded only by deployments that opt into PostgreSQL.

Durable tenant scope uses four explicit non-null columns. Optimistic versions protect mutable run state. Migrations are immutable, ordered, checksummed, and serialized by a PostgreSQL advisory transaction lock. Audit-chain appends are also serialized transactionally.

## Consequences
Local development remains dependency-light and fast. PostgreSQL can be certified independently and replaced by another persistence adapter without changing control-plane business logic. Production deployments must run migrations and supply resolved credentials through their secret-management boundary.
