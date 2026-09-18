-- File: adapters/persistence/postgres/migrations/0003_runtime_backends.sql
-- Purpose: Creates durable distributed execution, artifact catalog, telemetry, and alert-state tables for multi-instance control-plane operation.
-- Author: Raushan Raj

CREATE TABLE qualyntra_workers (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL DEFAULT '',
  project_id TEXT NOT NULL DEFAULT '',
  environment_id TEXT NOT NULL DEFAULT '',
  capabilities_json JSONB NOT NULL,
  max_concurrency INTEGER NOT NULL CHECK (max_concurrency > 0),
  state TEXT NOT NULL CHECK (state IN ('online','draining','offline')),
  registered_at TIMESTAMPTZ NOT NULL,
  heartbeat_at TIMESTAMPTZ NOT NULL,
  active_leases INTEGER NOT NULL DEFAULT 0 CHECK (active_leases >= 0),
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ix_qualyntra_workers_scope_heartbeat ON qualyntra_workers (organization_id,workspace_id,project_id,environment_id,state,heartbeat_at);

CREATE TABLE qualyntra_distributed_jobs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL DEFAULT '',
  project_id TEXT NOT NULL DEFAULT '',
  environment_id TEXT NOT NULL DEFAULT '',
  request_json JSONB NOT NULL,
  requirements_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  state TEXT NOT NULL CHECK (state IN ('queued','leased','running','succeeded','failed','cancelled','dead-letter')),
  attempt INTEGER NOT NULL DEFAULT 0 CHECK (attempt >= 0),
  max_attempts INTEGER NOT NULL CHECK (max_attempts > 0),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  available_at TIMESTAMPTZ NOT NULL,
  lease_id TEXT,
  lease_worker_id TEXT,
  lease_acquired_at TIMESTAMPTZ,
  lease_heartbeat_at TIMESTAMPTZ,
  lease_expires_at TIMESTAMPTZ,
  result_json JSONB,
  failure_json JSONB,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ix_qualyntra_jobs_queue ON qualyntra_distributed_jobs (state,available_at,created_at,id);
CREATE INDEX ix_qualyntra_jobs_scope_state ON qualyntra_distributed_jobs (organization_id,workspace_id,project_id,environment_id,state,created_at);
CREATE INDEX ix_qualyntra_jobs_lease_expiry ON qualyntra_distributed_jobs (lease_expires_at) WHERE state IN ('leased','running');

CREATE TABLE qualyntra_artifacts (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL DEFAULT '',
  project_id TEXT NOT NULL DEFAULT '',
  environment_id TEXT NOT NULL DEFAULT '',
  run_id TEXT,
  evidence_id TEXT,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  sha256 TEXT NOT NULL,
  storage_adapter_id TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL,
  retention_until TIMESTAMPTZ,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ix_qualyntra_artifacts_scope_created ON qualyntra_artifacts (organization_id,workspace_id,project_id,environment_id,created_at DESC,id);
CREATE INDEX ix_qualyntra_artifacts_run ON qualyntra_artifacts (run_id,created_at DESC) WHERE run_id IS NOT NULL;
CREATE INDEX ix_qualyntra_artifacts_retention ON qualyntra_artifacts (retention_until) WHERE retention_until IS NOT NULL;

CREATE TABLE qualyntra_telemetry (
  signal_type TEXT NOT NULL CHECK (signal_type IN ('log','metric','span','health')),
  id TEXT NOT NULL,
  event_at TIMESTAMPTZ NOT NULL,
  organization_id TEXT,
  workspace_id TEXT,
  project_id TEXT,
  environment_id TEXT,
  correlation_id TEXT,
  trace_id TEXT,
  name TEXT,
  record_json JSONB NOT NULL,
  PRIMARY KEY (signal_type,id)
);
CREATE INDEX ix_qualyntra_telemetry_scope_time ON qualyntra_telemetry (organization_id,workspace_id,project_id,environment_id,event_at DESC);
CREATE INDEX ix_qualyntra_telemetry_correlation ON qualyntra_telemetry (correlation_id,event_at DESC) WHERE correlation_id IS NOT NULL;
CREATE INDEX ix_qualyntra_telemetry_trace ON qualyntra_telemetry (trace_id,event_at DESC) WHERE trace_id IS NOT NULL;

CREATE TABLE qualyntra_alert_cooldowns (
  state_key TEXT PRIMARY KEY,
  last_triggered_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE qualyntra_alert_records (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL,
  organization_id TEXT,
  workspace_id TEXT,
  project_id TEXT,
  environment_id TEXT,
  triggered_at TIMESTAMPTZ NOT NULL,
  record_json JSONB NOT NULL
);
CREATE INDEX ix_qualyntra_alert_scope_time ON qualyntra_alert_records (organization_id,workspace_id,project_id,environment_id,triggered_at DESC);
