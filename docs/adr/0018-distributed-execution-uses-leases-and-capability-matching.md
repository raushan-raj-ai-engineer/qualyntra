<!--
Purpose: Records the decision to model distributed execution through vendor-neutral leases and worker capabilities rather than a specific queue or cluster technology.
Author: Raushan Raj
-->
# ADR 0018: Distributed execution uses leases and capability matching

## Decision
Qualyntra models distributed execution with `DistributedExecutionQueue`, capability-based workers, bounded leases, heartbeats, attempt budgets, cancellation, and lease-expiry recovery.

## Rationale
A direct dependency on Kubernetes, Redis, RabbitMQ, cloud queues, or one CI system would make execution topology part of the product kernel. Lease semantics are the stable platform behavior; infrastructure-specific persistence and transport can be adapters.

## Consequences
- The in-memory queue is a reference implementation, not a production durability claim.
- Production queue adapters must make lease/state transitions atomic.
- Workers advertise capabilities rather than being selected by hardcoded machine names.
- Stale lease IDs cannot complete work.
- Raw environment secrets are rejected before queue persistence.
