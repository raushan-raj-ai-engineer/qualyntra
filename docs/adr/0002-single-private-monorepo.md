<!--
File: docs/adr/0002-single-private-monorepo.md
Purpose: Records the decision to use one private polyglot monorepo instead of per-language product forks.
Author: Raushan Raj
-->

# ADR 0002 — Single Private Polyglot Monorepo

**Decision:** Keep TypeScript platform code, Python/Java/.NET SDKs, schemas, adapters and documentation in one private repository.

**Reason:** Contract changes, release evidence and docs remain synchronized. Separate publishable SDK artifacts can later be produced from the same source of truth.

