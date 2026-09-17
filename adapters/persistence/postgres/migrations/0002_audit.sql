-- File: adapters/persistence/postgres/migrations/0002_audit.sql
-- Purpose: Creates the durable globally ordered tamper-evident audit-chain table.
-- Author: Raushan Raj

CREATE TABLE qualyntra_audit_records (
  id TEXT PRIMARY KEY,
  sequence BIGINT NOT NULL UNIQUE CHECK (sequence > 0),
  timestamp TIMESTAMPTZ NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  outcome TEXT NOT NULL,
  correlation_id TEXT,
  organization_id TEXT,
  workspace_id TEXT,
  project_id TEXT,
  environment_id TEXT,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_hash TEXT,
  hash TEXT NOT NULL
);
CREATE INDEX ix_qualyntra_audit_scope_sequence ON qualyntra_audit_records (organization_id,workspace_id,project_id,environment_id,sequence);
