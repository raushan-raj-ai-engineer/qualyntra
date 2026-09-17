/**
 * File: tests/java-runtime/java-runtime.test.ts
 * Purpose: Verifies JVM health, compiler discovery, optional test-framework capabilities, and lifecycle behavior without requiring live JUnit/TestNG dependencies.
 * Author: Raushan Raj
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { JavaRuntimeAdapter } from '../../adapters/runtimes/java/src';
import type { ProcessProbeResult } from '../../packages/runtime/src';

function result(stdout: string, stderr = ''): ProcessProbeResult {
  return {
    available: true,
    exitCode: 0,
    stdout,
    stderr,
    durationMs: 1,
    timedOut: false,
  };
}

test('java runtime reports unavailable executable without throwing', async () => {
  const adapter = new JavaRuntimeAdapter({
    probe: async () => ({ available: false, stdout: '', stderr: 'missing', durationMs: 1, timedOut: false }),
  });
  const health = await adapter.runtimeHealth();
  assert.equal(health.status, 'unavailable');
  assert.equal(health.identity.tool, 'java');
});

test('java runtime discovers JVM, javac, JUnit, and TestNG capabilities', async () => {
  const adapter = new JavaRuntimeAdapter({
    probe: async (_command, args = []) => {
      if (args[0] === '-version') return result('javac 17.0.10');
      return result('', [
        'Property settings:',
        '    java.version = 17.0.10',
        '    java.vendor = Example Vendor',
        '    java.runtime.name = Example Runtime',
        '    java.vm.name = Example VM',
        '    os.name = TestOS',
        '    os.version = 1',
        '    os.arch = arm64',
      ].join('\n'));
    },
    classProbe: async () => ({ junit: true, testng: true }),
  });
  const health = await adapter.runtimeHealth({ metadata: { javaClasspath: '/tmp/deps/*' } });
  assert.equal(health.status, 'healthy');
  assert.equal(health.identity.detectedVersion, '17.0.10');
  assert.equal(health.metadata?.javacVersion, '17.0.10');
  assert.deepEqual(health.metadata?.classes, { junit: true, testng: true });

  const capabilities = await adapter.runtimeCapabilities();
  assert.equal(capabilities.compiler, true);
  assert.equal(capabilities.junit, true);
  assert.equal(capabilities.testng, true);
});

test('java runtime lifecycle becomes ready after successful initialization', async () => {
  const adapter = new JavaRuntimeAdapter({
    probe: async (_command, args = []) => args[0] === '-version'
      ? result('javac 21.0.2')
      : result('', '    java.version = 21.0.2\n'),
    classProbe: async () => ({ junit: false, testng: false }),
  });
  assert.equal(adapter.lifecycle(), 'created');
  await adapter.initialize();
  assert.equal(adapter.lifecycle(), 'ready');
  await adapter.shutdown();
  assert.equal(adapter.lifecycle(), 'stopped');
});
