/**
 * File: tests/runtime/runtime-manager.test.ts
 * Purpose: Verifies runtime registration and lifecycle orchestration through the shared central adapter registry.
 * Author: Raushan Raj
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { AdapterRegistry } from '../../packages/core/src/adapter-registry';
import { RuntimeManager } from '../../packages/runtime/src/runtime-manager';
import type {
  RuntimeAdapter,
  RuntimeCapabilitySet,
  RuntimeCompatibility,
  RuntimeContext,
  RuntimeHealth,
  RuntimeInstanceIdentity,
  RuntimeLifecycleState,
} from '../../packages/contracts/src/runtime';

class FakeRuntime implements RuntimeAdapter {
  readonly descriptor = {
    id: 'runtime.fake',
    kind: 'automation' as const,
    version: '1.0.0',
    displayName: 'Fake Runtime',
    description: 'Runtime used only for contract tests.',
    capabilities: ['test'],
  };
  private state: RuntimeLifecycleState = 'created';

  lifecycle(): RuntimeLifecycleState {
    return this.state;
  }

  async initialize(_context?: RuntimeContext): Promise<void> {
    this.state = 'ready';
  }

  async shutdown(): Promise<void> {
    this.state = 'stopped';
  }

  async identity(): Promise<RuntimeInstanceIdentity> {
    return { adapterId: this.descriptor.id, tool: 'fake', detectedVersion: '1.0.0' };
  }

  async runtimeCapabilities(): Promise<RuntimeCapabilitySet> {
    return { test: true };
  }

  private compatibility(): RuntimeCompatibility {
    return {
      tool: 'fake',
      detectedVersion: '1.0.0',
      status: 'certified',
      reason: 'Test runtime.',
    };
  }

  async runtimeHealth(): Promise<RuntimeHealth> {
    return {
      status: 'healthy',
      checkedAt: new Date().toISOString(),
      lifecycle: this.state,
      identity: await this.identity(),
      compatibility: this.compatibility(),
    };
  }

  async health() {
    return { status: 'healthy' as const, checkedAt: new Date().toISOString() };
  }
}

test('runtime manager reuses the central adapter registry', async () => {
  const adapters = new AdapterRegistry();
  const runtimes = new RuntimeManager(adapters);
  const runtime = new FakeRuntime();

  runtimes.register(runtime);
  assert.equal(adapters.has('runtime.fake'), true);
  assert.equal(runtimes.list().length, 1);

  const initialized = await runtimes.initialize('runtime.fake');
  assert.equal(initialized.lifecycle, 'ready');

  await runtimes.shutdown('runtime.fake');
  assert.equal(runtime.lifecycle(), 'stopped');
});

test('runtime manager rejects adapters not registered as runtimes', () => {
  const adapters = new AdapterRegistry();
  adapters.register({
    descriptor: {
      id: 'adapter.only',
      kind: 'runner',
      version: '1',
      displayName: 'Adapter only',
      description: 'Not a runtime.',
      capabilities: [],
    },
    health: async () => ({ status: 'healthy' as const, checkedAt: new Date().toISOString() }),
  });
  const runtimes = new RuntimeManager(adapters);
  assert.throws(() => runtimes.get('adapter.only'), /Runtime not registered/);
});
