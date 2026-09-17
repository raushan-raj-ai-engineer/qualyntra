/**
 * File: tests/agent/container-packaging.test.ts
 * Purpose: Verifies static security and packaging invariants for the execution-agent container when a Docker daemon is unavailable in the release test environment.
 * Author: Raushan Raj
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path: string): string => readFileSync(path, 'utf8');

test('agent Dockerfile uses a non-root runtime, healthcheck, and compiled entrypoint without embedded credentials', () => {
  const dockerfile = read('apps/agent/Dockerfile');
  assert.match(dockerfile, /FROM node:22-bookworm-slim AS runtime/);
  assert.match(dockerfile, /USER qualyntra/);
  assert.match(dockerfile, /HEALTHCHECK[\s\S]*127\.0\.0\.1:4321\/health/);
  assert.match(dockerfile, /CMD \["node","dist\/apps\/agent\/src\/main\.js"\]/);
  assert.doesNotMatch(dockerfile, /QUALYNTRA_AGENT_TOKEN\s*=/);
  assert.doesNotMatch(dockerfile, /COPY\s+\.env(?:\s|$)/m);
});

test('docker build context excludes repository metadata, local env files, dependencies, and generated output', () => {
  const dockerignore = read('.dockerignore').split(/\r?\n/).map((line: string) => line.trim());
  for (const required of ['.git', '.github', '.env', '.env.*', 'node_modules', 'dist', '.qualyntra', 'artifacts']) {
    assert.ok(dockerignore.includes(required), `missing .dockerignore rule: ${required}`);
  }
});
