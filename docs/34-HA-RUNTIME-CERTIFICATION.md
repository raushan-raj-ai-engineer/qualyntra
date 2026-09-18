<!--
File: docs/34-HA-RUNTIME-CERTIFICATION.md
Purpose: Documents live multi-replica certification for PostgreSQL runtime state, shared S3-compatible artifacts, idempotency, leases, and restart recovery.
Author: Raushan Raj
-->
# HA Runtime Certification

## Goal

This milestone certifies that Qualyntra can run more than one Control Plane instance against shared durable state without duplicate run creation, duplicate job leases, process-local artifact bytes, or stranded work after a replica restart.

The normal unit/release gate stays independent of Docker and PostgreSQL. Live HA certification is a separate operator gate because it intentionally starts external services and restarts one Control Plane container.

## Certified dependency set

The production Control Plane image pins the HA-only runtime dependencies inside the deployment/adapter boundary:

- `pg` `8.23.0`
- `@aws-sdk/client-s3` `3.1132.0`
- `@aws-sdk/s3-request-presigner` `3.1132.0`

The live certification topology uses PostgreSQL `18.6` and Moto Server `5.2.3` as an S3-compatible test endpoint. Moto is a certification dependency only; it is not a production storage recommendation.

## Security boundary

PostgreSQL, API, agent, and S3 credentials are generated into `deploy/compose/.ha-secrets/`. That directory is ignored by Git. Control Plane containers receive credentials as mounted files rather than literal values in Compose manifests.

S3 credentials remain inside the S3 adapter. Platform contracts, the dashboard, runtime queue contracts, and artifact metadata never receive raw object-storage credentials.

## Prepare

```bash
node scripts/prepare-ha-certification.mjs
node scripts/validate-ha-runtime.mjs
```

Then start the certification topology:

```bash
docker compose -f deploy/compose/docker-compose.ha.yml up --build -d
```

Wait until both Control Plane replicas are healthy:

```bash
docker compose -f deploy/compose/docker-compose.ha.yml ps
```

## Live certification

```bash
node scripts/ha-runtime-certify.mjs
```

The certification performs these checks:

1. two replicas concurrently submit the same idempotent run and receive one created run plus one replay of the same run ID;
2. an artifact written through replica A is read and SHA-256 verified through replica B;
3. two workers race for one queued job and exactly one lease succeeds;
4. one replica leases another job and is restarted;
5. PostgreSQL-backed recovery requeues the expired lease and the surviving replica leases that same job.

Successful output ends with `"ok": true` and all certification flags set to `true`.

## Production interpretation

Passing this gate certifies the Qualyntra runtime contracts and PostgreSQL/S3 composition for multi-Control-Plane correctness. It does not mean Moto is a supported production object store. Production S3-compatible or cloud object storage must provide equivalent S3 semantics and should be separately environment-certified.

After this gate passes, Helm can allow multiple Control Plane replicas only when `runtimeBackend.mode=postgres` and shared S3-compatible artifact storage are configured. Memory/local-filesystem modes remain single-replica reference modes.
