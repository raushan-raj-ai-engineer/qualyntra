<!--
Purpose: Documents Qualyntra distributed execution, worker capabilities, leases, recovery, retries, cancellation, and horizontal-scaling boundaries.
Author: Raushan Raj
-->
# Distributed Execution

Qualyntra distributes execution through vendor-neutral queue and worker contracts. The platform does not require Kubernetes, Redis, RabbitMQ, SQS, Service Bus, or another scheduler/queue technology.

## Model

1. A coordinator converts an `ExecutionRequest` into a durable-ready `DistributedExecutionJob`.
2. Jobs carry explicit language/runner/engine/label/OS requirements.
3. Workers register capabilities and a maximum concurrency.
4. Compatible workers lease queued jobs for a bounded period.
5. Lease heartbeats extend ownership while the job executes.
6. Expired leases are recovered; recoverable jobs are requeued until `maxAttempts`, then dead-lettered.
7. Completion, failure, and cancellation are terminal state transitions.

Raw environment values are rejected at the coordinator boundary. Distributed jobs must use `secretRefs`, preventing queue persistence from becoming a secret store.

## Horizontal scale

The reference `InMemoryDistributedExecutionQueue` exists for local development and conformance behavior. Production deployments should implement `DistributedExecutionQueue` on top of a durable transactional backend while preserving lease ownership, atomic transitions, worker concurrency, and idempotency semantics.

## Worker selection

Selection is capability based rather than hostname based. Requirements may include language, runner, engine, operating system, and arbitrary labels such as `gpu`, `chrome`, or `arm64`.

## Failure recovery

A worker that loses its lease cannot complete the job with the stale lease ID. Expired leases release worker capacity and requeue or dead-letter work according to the attempt budget. This makes process/node failure recoverable without embedding infrastructure-vendor logic in the platform kernel.
