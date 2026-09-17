/**
 * File: tests/java-runtime/java-bridge.test.ts
 * Purpose: Verifies the TypeScript Java bridge client uses shell-free JSON stdio and normalizes health/result responses without requiring a compiled Java bridge during unit tests.
 * Author: Raushan Raj
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { JavaBridgeClient } from '../../adapters/runtimes/java/src';
import type { ProcessProbeResult } from '../../packages/runtime/src';

function response(payload: unknown, exitCode = 0): ProcessProbeResult {
  return {
    available: true,
    exitCode,
    stdout: JSON.stringify(payload),
    stderr: '',
    durationMs: 1,
    timedOut: false,
  };
}

test('java bridge client sends health request over stdin and parses response', async () => {
  let observedInput = '';
  const client = new JavaBridgeClient({
    classpath: '/tmp/java-sdk',
    probe: async (_command, args = [], options = {}) => {
      assert.deepEqual(args, ['-cp', '/tmp/java-sdk', 'io.qualyntra.sdk.Bridge']);
      observedInput = options.input ?? '';
      return response({ ok: true, data: { status: 'healthy', runtime: { version: '17' } } });
    },
  });
  const health = await client.health();
  assert.equal(health.status, 'healthy');
  assert.equal(JSON.parse(observedInput).operation, 'health');
});

test('java bridge client returns canonical universal result keys', async () => {
  const client = new JavaBridgeClient({
    classpath: '/tmp/java-sdk',
    probe: async () => response({
      ok: true,
      data: {
        results: [{
          id: 'test_1',
          runId: 'run-1',
          name: 'works',
          status: 'passed',
          durationMs: 4,
          runtime: { language: 'java', runner: 'junit' },
        }],
      },
    }),
  });
  const results = await client.normalizeJUnit('<testsuite/>', 'run-1', { language: 'java', runner: 'junit' });
  assert.equal(results[0]?.runId, 'run-1');
  assert.equal(results[0]?.durationMs, 4);
});
