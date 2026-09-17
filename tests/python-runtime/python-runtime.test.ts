/**
 * File: tests/python-runtime/python-runtime.test.ts
 * Purpose: Verifies Python runtime discovery is truthful, lifecycle-aware, and safe when the configured executable is unavailable.
 * Author: Raushan Raj
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { PythonRuntimeAdapter } from '../../adapters/runtimes/python/src';

test('python runtime reports unavailable executable without throwing', async () => {
  const runtime = new PythonRuntimeAdapter('qualyntra-python-command-that-does-not-exist');
  const health = await runtime.runtimeHealth();
  assert.equal(health.status, 'unavailable');
  assert.equal(health.identity.tool, 'python');
  assert.equal(health.identity.detectedVersion, undefined);
});

test('python runtime discovers interpreter and optional package capabilities', async () => {
  const runtime = new PythonRuntimeAdapter('python3');
  const snapshot = await runtime.snapshot();
  assert.ok(snapshot?.version);
  assert.equal(Object.prototype.hasOwnProperty.call(snapshot?.packages ?? {}, 'pytest'), true);
  const capabilities = await runtime.runtimeCapabilities();
  assert.equal(capabilities.processExecution, true);
  assert.equal(typeof capabilities.pytest, 'boolean');
});

test('python runtime lifecycle becomes ready after successful initialization', async () => {
  const runtime = new PythonRuntimeAdapter('python3');
  await runtime.initialize();
  assert.equal(runtime.lifecycle(), 'ready');
  await runtime.shutdown();
  assert.equal(runtime.lifecycle(), 'stopped');
});
