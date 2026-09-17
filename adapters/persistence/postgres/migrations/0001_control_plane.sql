-- File: adapters/persistence/postgres/migrations/0001_control_plane.sql
-- Purpose: Creates the tenant-scoped durable control-plane tables, indexes, and optimistic-version columns.
-- Author: Raushan Raj

CREATE TABLE qualyntra_runs (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL DEFAULT '',
  project_id TEXT NOT NULL DEFAULT '',
  environment_id TEXT NOT NULL DEFAULT '',
  request_json JSONB NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version BIGINT NOT NULL DEFAULT 1 CHECK (version > 0),
  idempotency_key TEXT,
  request_fingerprint TEXT
);
CREATE UNIQUE INDEX uq_qualyntra_runs_idempotency ON qualyntra_runs (organization_id,workspace_id,project_id,environment_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX ix_qualyntra_runs_scope_created ON qualyntra_runs (organization_id,workspace_id,project_id,environment_id,created_at,id);

CREATE TABLE qualyntra_results (
  run_id TEXT NOT NULL REFERENCES qualyntra_runs(id) ON DELETE CASCADE,
  ordinal INTEGER NOT NULL CHECK (ordinal >= 0),
  result_id TEXT NOT NULL,
  result_json JSONB NOT NULL,
  PRIMARY KEY (run_id,ordinal),
  UNIQUE (run_id,result_id)
);

CREATE TABLE qualyntra_evaluations (
  id TEXT PRIMARY KEY,
  organization_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL DEFAULT '',
  project_id TEXT NOT NULL DEFAULT '',
  environment_id TEXT NOT NULL DEFAULT '',
  profile_id TEXT NOT NULL,
  dataset_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX ix_qualyntra_evaluations_scope_created ON qualyntra_evaluations (organization_id,workspace_id,project_id,environment_id,created_at,id);

CREATE TABLE qualyntra_policies (
  organization_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL DEFAULT '',
  project_id TEXT NOT NULL DEFAULT '',
  environment_id TEXT NOT NULL DEFAULT '',
  policy_id TEXT NOT NULL,
  policy_json JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id,workspace_id,project_id,environment_id,policy_id)
);

CREATE TABLE qualyntra_release_decisions (
  id TEXT NOT NULL,
  release_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL DEFAULT '',
  project_id TEXT NOT NULL DEFAULT '',
  environment_id TEXT NOT NULL DEFAULT '',
  decision_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (organization_id,workspace_id,project_id,environment_id,release_id)
);
