<!--
Purpose: Records the decision to expose Qualyntra through a versioned tenant-aware API while keeping authentication identity and persistence replaceable.
Author: Raushan Raj
-->
# ADR 0014: Control plane is versioned, tenant-aware, and storage-neutral

## Status
Accepted.

## Context
Qualyntra now supports multiple execution engines, languages, AI providers, mobile automation, external result ingestion, and enterprise governance. Direct module invocation is not a sufficient product boundary for dashboards, CI, workers, or customer systems.

## Decision
Expose `/api/v1` as the stable control-plane boundary. Protect business endpoints with an injected authenticator and governance RBAC, require tenant context, generate server-owned resource identifiers, and route storage through repository interfaces. The initial server uses a bearer bootstrap authenticator and in-memory repositories only as reference implementations.

Health and readiness remain public probes. Raw execution environment values are rejected by the control plane in favor of secret references. Adapter discovery must not call adapter health implicitly because health can perform network or process work.

## Consequences
OIDC, enterprise SSO, PostgreSQL, distributed workers, and durable queues can be added without rewriting API contracts. Authentication and persistence can evolve independently. API consumers have a versioned contract and OpenAPI document, while tenant isolation and governance remain enforced in one place.
