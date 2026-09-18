<!--
File: docs/35-PERFORMANCE-SCALE-CERTIFICATION.md
Purpose: Documents repeatable live performance and scale certification for the already-certified multi-replica Qualyntra HA runtime.
Author: Raushan Raj
-->
# Performance and Scale Certification

## Goal

This milestone measures the certified HA composition under controlled concurrency instead of changing product correctness semantics. The normal release gate remains deterministic and hardware-neutral. Live performance certification is an explicit operator gate because latency and throughput depend on CPU, memory, Docker resources, storage, and host contention.

The live certifier uses the same two-Control-Plane PostgreSQL/S3 topology that already passed HA certification, then overlays a high local API rate ceiling and a deliberately bounded PostgreSQL pool. This creates repeatable connection-pool contention without weakening production defaults.

## Scenarios

The report covers:

1. concurrent run creation split across both Control Plane replicas;
2. high-fanout atomic idempotency on the same key;
3. worker online/draining churn;
4. bulk distributed-job enqueue plus concurrent lease/complete drain;
5. shared S3-compatible artifact upload and opposite-replica SHA-256 verification;
6. PostgreSQL-backed telemetry ingestion volume;
7. survivor-replica API load while the other Control Plane is restarted;
8. post-load readiness of both replicas.

The API concurrency is intentionally higher than the scale overlay's combined PostgreSQL pool target so the run exercises pool waiting rather than only idle connections.

## Profiles

`QUALYNTRA_SCALE_PROFILE` selects the workload:

| Profile | API requests | Queue jobs | Workers | Telemetry points | Intended use |
| --- | ---: | ---: | ---: | ---: | --- |
| `smoke` | 60 | 100 | 6 | 100 | quick developer validation |
| `standard` | 240 | 1,000 | 16 | 1,000 | default local certification |
| `stress` | 1,000 | 5,000 | 32 | 5,000 | dedicated performance host |

Every count/concurrency value can be overridden with `QUALYNTRA_SCALE_*` environment variables without editing source.

## Default SLO gates

The defaults are intentionally conservative enough for repeatable local certification and should be tightened for a dedicated CI/performance environment:

- request error rate: `0`;
- API p95: at most `2500 ms`;
- API p99: at most `5000 ms`;
- API throughput: at least `10 req/s`;
- queue drain: at least `5 jobs/s`;
- artifact throughput: at least `0.5 MiB/s`;
- telemetry ingestion: at least `15 req/s`;
- survivor-replica p95 during peer restart: at most `3000 ms`.

Thresholds are environment-configurable. A performance change should update an approved baseline rather than silently weakening the thresholds to make a regression pass.

## Start the scale topology

Generate HA secrets if needed:

```bash
node scripts/prepare-ha-certification.mjs
```

Validate assets:

```bash
node scripts/validate-ha-runtime.mjs
node scripts/validate-performance-scale.mjs
```

Start the certified HA topology plus the scale overlay:

```bash
docker compose \
  -f deploy/compose/docker-compose.ha.yml \
  -f deploy/compose/docker-compose.scale.yml \
  up --build -d
```

Wait for both Control Planes to become healthy, then run the standard profile:

```bash
QUALYNTRA_SCALE_PROFILE=standard \
node scripts/performance-scale-certify.mjs
```

For a quick developer pass:

```bash
QUALYNTRA_SCALE_PROFILE=smoke \
node scripts/performance-scale-certify.mjs
```

For a dedicated performance host:

```bash
QUALYNTRA_SCALE_PROFILE=stress \
node scripts/performance-scale-certify.mjs
```

## Machine-readable evidence

The certifier writes:

```text
artifacts/performance-scale-report.json
```

The report contains only non-secret configuration, per-scenario latency/throughput/error measurements, SLO decisions, profile name, and timestamps. API tokens remain file-mounted/read locally and are never emitted into the report.

The report is intentionally under the root runtime `artifacts/` directory, which is source-control ignored.

## Interpretation

A passing local result establishes a measured baseline for that host and Docker resource allocation. It does not mean every production environment will have the same throughput. Production release qualification should execute the same certifier on representative infrastructure and retain the JSON report as release evidence.

Performance failures should be investigated as regressions in SQL/query behavior, pool sizing, lock contention, storage latency, API processing, or infrastructure resources. Do not increase SLO thresholds as the first response to a failing gate.
