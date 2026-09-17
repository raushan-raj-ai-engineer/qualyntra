/**
 * File: packages/runtime/src/runtime-manager.ts
 * Purpose: Coordinates runtime adapters through the existing central AdapterRegistry without creating a competing registry.
 * Author: Raushan Raj
 */
import type { RuntimeAdapter, RuntimeContext, RuntimeHealth } from '../../contracts/src/runtime';
import { AdapterRegistry } from '../../core/src/adapter-registry';

export class RuntimeManager {
  private readonly runtimeIds = new Set<string>();

  constructor(private readonly adapters: AdapterRegistry) {}

  register(runtime: RuntimeAdapter): void {
    this.adapters.register(runtime);
    this.runtimeIds.add(runtime.descriptor.id);
  }

  replace(runtime: RuntimeAdapter): void {
    this.adapters.replace(runtime);
    this.runtimeIds.add(runtime.descriptor.id);
  }

  get(id: string): RuntimeAdapter {
    if (!this.runtimeIds.has(id)) {
      throw new Error(`Runtime not registered: ${id}`);
    }
    return this.adapters.get<RuntimeAdapter>(id);
  }

  list(): RuntimeAdapter[] {
    return [...this.runtimeIds].map((id) => this.adapters.get<RuntimeAdapter>(id));
  }

  async initialize(id: string, context?: RuntimeContext): Promise<RuntimeHealth> {
    const runtime = this.get(id);
    await runtime.initialize(context);
    return runtime.runtimeHealth(context);
  }

  async shutdown(id: string): Promise<void> {
    await this.get(id).shutdown();
  }

  async health(id: string, context?: RuntimeContext): Promise<RuntimeHealth> {
    return this.get(id).runtimeHealth(context);
  }

  async healthAll(context?: RuntimeContext): Promise<RuntimeHealth[]> {
    return Promise.all(this.list().map((runtime) => runtime.runtimeHealth(context)));
  }
}
