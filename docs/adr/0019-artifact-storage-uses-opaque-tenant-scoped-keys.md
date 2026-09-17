<!--
File: docs/adr/0019-artifact-storage-uses-opaque-tenant-scoped-keys.md
Purpose: Records the decision to separate artifact metadata from bytes and use generated tenant-scoped opaque keys with adapter-owned storage credentials.
Author: Raushan Raj
-->

# ADR 0019: Artifact storage uses opaque tenant-scoped keys

## Decision

Qualyntra separates artifact metadata/catalog behavior from artifact byte storage. The platform generates opaque object keys using a digest of tenant scope plus a cryptographically strong artifact ID. Display names never control filesystem paths or object keys. Cloud credentials and request signing remain adapter/deployment responsibilities.

## Why

Evidence is high-volume, security-sensitive, and frequently much larger than relational control-plane records. Storing bytes directly in the control-plane repository would couple database scaling to trace/video/log volume. Allowing caller-provided object keys would create traversal, overwrite, cross-tenant, and naming-policy risks.

## Consequences

- execution engines can emit the same evidence contract regardless of local, S3-compatible, Azure Blob, or future storage;
- storage adapters can rotate credentials or move providers without rewriting result/evaluation contracts;
- metadata can be indexed transactionally while bytes use object-storage economics;
- all downloadable evidence must be authorized through catalog scope and short-lived grants rather than durable public URLs;
- future compliance features such as WORM retention, KMS/BYOK, malware scanning, or legal hold stay adapter/service concerns.
