/**
 * File: tests/python-runtime/pytest-adapter.test.ts
 * Purpose: Verifies Pytest health behavior deterministically without requiring Pytest to be installed in the host environment.
 * Author: Raushan Raj
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { PytestAdapter } from '../../adapters/runners/pytest/src';
import type { ProcessProbeResult } from '../../packages/runtime/src/process-probe';

const result = (overrides: Partial<ProcessProbeResult>): ProcessProbeResult => ({
  available: true,
  exitCode: 0,
  stdout: '',
  stderr: '',
  durationMs: 1,
  timedOut: false,
  ...overrides,
});

test('pytest adapter reports unavailable runtime without throwing', async () => {
  const adapter = new PytestAdapter('python3', async () => result({ available: false, exitCode: undefined }));
  const health = await adapter.health();
  assert.equal(health.status, 'unavailable');
});

test('pytest adapter reports detected pytest version from injected probe', async () => {
  const adapter = new PytestAdapter('python3', async () => result({ stdout: '9.1.0\n' }));
  const health = await adapter.health();
  assert.equal(health.status, 'healthy');
  assert.match(health.message ?? '', /9\.1\.0/);
});
