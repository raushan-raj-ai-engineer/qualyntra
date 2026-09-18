# Qualyntra Durable Runtime Backends

<!-- Purpose: Documents PostgreSQL-backed distributed execution, artifact catalog, telemetry, alert state, migration, and multi-instance runtime composition. -->
<!-- Author: Raushan Raj -->

## Goal

The durable-runtime-backends milestone removes the remaining process-local control-plane state from the execution scheduler, artifact metadata catalog, telemetry store, and alert cooldown/record store. The in-memory implementations remain available for unit tests and local development, while PostgreSQL becomes the shared state boundary for deployments that require restart recovery or multiple control-plane replicas.

## Backend selection

The reference control plane defaults to:

```text
QUALYNTRA_RUNTIME_BACKEND=memory
```

Durable mode is explicitly enabled with:

```text
QUALYNTRA_RUNTIME_BACKEND=postgres
QUALYNTRA_POSTGRES_CONNECTION_STRING_FILE=/run/secrets/qualyntra/postgres-connection
QUALYNTRA_RUNTIME_RECOVERY_INTERVAL_MS=15000
```

The connection string is read from a bounded file-mounted secret and is never copied into runtime contracts, telemetry, or persisted platform records.

PostgreSQL mode also supports:

```text
QUALYNTRA_POSTGRES_MIGRATE_ON_START=true
QUALYNTRA_POSTGRES_MIGRATIONS_DIR=/opt/qualyntra/migrations/postgres
QUALYNTRA_POSTGRES_MAX_CONNECTIONS=20
QUALYNTRA_POSTGRES_STATEMENT_TIMEOUT_MS=30000
QUALYNTRA_POSTGRES_SSL=true
```

The PostgreSQL adapter continues to use the optional `pg` driver boundary established by the persistence foundation. A deployment that enables PostgreSQL must include that driver in the control-plane runtime image. Core platform packages do not import `pg`.

## Durable components

### Distributed execution

`PostgresDistributedExecutionQueue` persists jobs, workers, attempts, leases, heartbeats, failures, results, and worker concurrency. Lease acquisition runs inside a transaction and uses row locking with `FOR UPDATE SKIP LOCKED`, allowing multiple control-plane replicas to compete for work without assigning the same job twice.

Worker identity scope is immutable. Re-registering an existing worker ID under a different tenant scope fails closed instead of silently moving active worker identity across organizations or projects.

Lease heartbeat, start, completion, failure, cancellation, and expiry recovery all validate current lease ownership. Completion/failure and worker active-lease accounting are updated transactionally.

### Artifact catalog

Artifact bytes remain behind `ArtifactStorageAdapter`; PostgreSQL stores only tenant scope, hash, size, storage key, storage adapter, retention metadata, and user-facing artifact metadata. This allows control-plane replicas to share one artifact catalog while object bytes remain in local/S3/Azure-compatible storage implementations.

For true multi-replica production operation, use shared object storage. A local filesystem adapter is appropriate only when all replicas share the same durable filesystem or when running a single control-plane replica.

### Telemetry

Logs, metrics, spans, and component-health signals are stored as redacted JSON plus indexed tenant/correlation fields. Sensitive-key redaction occurs before values reach SQL parameters.

Queries remain bounded and tenant-aware, including correlation ID, trace ID, signal name, and time-window filters.

### Alert state

Alert cooldown acquisition uses one atomic PostgreSQL upsert. Two control-plane replicas evaluating the same metric at the same time cannot both claim the same cooldown window. Alert records are persisted separately for tenant-scoped history.

## Migrations

Migration `0003_runtime_backends.sql` adds:

- `qualyntra_workers`
- `qualyntra_distributed_jobs`
- `qualyntra_artifacts`
- `qualyntra_telemetry`
- `qualyntra_alert_cooldowns`
- `qualyntra_alert_records`

The existing migration checksum and advisory-lock mechanism applies unchanged. Editing an already-applied migration remains a release error.

## Control-plane composition

`apps/control-plane/src/runtime-backends.ts` is the deployment composition boundary. Platform-kernel packages remain storage-neutral. The control plane receives repository/audit/queue/catalog/telemetry/alert interfaces and does not contain SQL.

Readiness includes the selected runtime backend health. PostgreSQL-unavailable deployments do not report ready.

## Horizontal scaling

PostgreSQL mode provides shared queue/catalog/telemetry/alert state required for multiple control-plane processes. However, horizontal scaling must also satisfy these deployment conditions:

1. artifact bytes use shared object storage or a shared filesystem;
2. every replica points at the same PostgreSQL database/schema;
3. migration execution remains serialized by the existing advisory lock;
4. bearer/OIDC identity configuration is consistent across replicas;
5. the deployment supplies the optional PostgreSQL driver;
6. external load balancing preserves no hidden in-process session dependency.

Until those conditions are met, keep `controlPlane.replicas: 1`.

## Failure and restart behavior

- queued jobs survive control-plane restart;
- leased/running jobs retain lease expiry and can be recovered after expiry;
- worker heartbeats and concurrency state survive restart;
- artifact metadata and retention deadlines survive restart;
- telemetry and alert history survive restart;
- alert cooldowns survive restart and are shared across replicas;
- migration state remains checksum-protected;
- expired execution leases are recovered once at control-plane startup and periodically thereafter using a bounded maintenance interval.

## Validation

Run the standard release gate:

```bash
npm run release:validate
node scripts/validate-deployment.mjs
git diff --check
```

PostgreSQL adapter unit tests use an injected driver boundary and do not require a live database. Production certification should additionally run the migration and concurrency suite against a real supported PostgreSQL service.
