/**
 * File: tests/python-runtime/process-probe.test.ts
 * Purpose: Verifies the shared runtime probe distinguishes missing commands from successful shell-free process execution.
 * Author: Raushan Raj
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { probeProcess } from '../../packages/runtime/src/process-probe';

test('process probe captures successful runtime metadata', async () => {
  const result = await probeProcess('python3', ['-c', "print('ok')"], { timeoutMs: 10_000 });
  assert.equal(result.available, true);
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout.trim(), 'ok');
});

test('process probe treats missing executable as unavailable', async () => {
  const result = await probeProcess('qualyntra-command-that-does-not-exist', [], { timeoutMs: 1_000 });
  assert.equal(result.available, false);
  assert.match(result.stderr, /ENOENT|not found/i);
});


test('process probe can send stdin without enabling a shell', async () => {
  const result = await probeProcess(
    process.execPath,
    ['-e', "process.stdin.setEncoding('utf8');let s='';process.stdin.on('data',c=>s+=c);process.stdin.on('end',()=>process.stdout.write(s.toUpperCase()))"],
    { input: 'bridge-input', timeoutMs: 10_000 },
  );
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, 'BRIDGE-INPUT');
});
