<!--
File: docs/21-PERSISTENCE-FOUNDATION.md
Purpose: Documents Qualyntra durable persistence architecture, PostgreSQL adapter, migrations, concurrency, idempotency, and audit durability.
Author: Raushan Raj
-->
# Persistence Foundation

Qualyntra keeps the control plane storage-neutral. `packages/control-plane` depends only on repository and audit contracts; PostgreSQL lives under `adapters/persistence/postgres`.

## Core guarantees

- Tenant-owned rows persist organization/workspace/project/environment scope explicitly.
- Optional scope levels are normalized to empty strings in PostgreSQL so uniqueness and idempotency semantics are deterministic.
- Run idempotency is durable through a partial unique index scoped to the complete tenant key.
- Run state changes use optimistic versions and reject stale writers.
- SQL values are parameterized. Migration SQL is the only intentionally static SQL body.
- Audit writes acquire a transaction-scoped advisory lock before reading the prior hash and appending the next record.
- Migration files are ordered, checksummed, and recorded. Changing an already-applied migration fails closed.
- PostgreSQL support is optional. Unit development and tests continue to use the in-memory repository.

## Driver boundary

`createOptionalNodePostgresDatabase()` loads `pg` only in deployments that choose PostgreSQL. The platform repository does not require `pg` to compile or run its normal unit suite.

Resolve database credentials through Qualyntra secret resolution or the deployment secret manager before creating the Postgres pool. Do not store raw connection credentials in repository configuration records.

## Production bootstrap sequence

1. Resolve the PostgreSQL connection secret outside source code.
2. Create the optional Postgres database adapter.
3. Load migrations from `adapters/persistence/postgres/migrations`.
4. Run `PostgresMigrationRunner` before marking readiness true.
5. Construct `PostgresControlPlaneRepository` and `PostgresAuditLog`.
6. Inject those interfaces into `ControlPlaneService` and `GovernanceService`.
7. Use `postgresHealth()` in readiness checks.

## Migration policy

Never edit an applied migration. Add the next monotonically increasing migration instead. The migration runner compares SHA-256 checksums and refuses drift.

## Integration testing

Repository unit tests remain offline. A production certification pipeline should additionally start a supported PostgreSQL instance, apply migrations, run the shared repository conformance suite against `PostgresControlPlaneRepository`, restart the service, and verify idempotency/audit durability across the restart.
