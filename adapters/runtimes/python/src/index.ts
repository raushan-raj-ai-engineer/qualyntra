/**
 * File: adapters/runtimes/python/src/index.ts
 * Purpose: Detects and reports Python runtime, Pytest, Playwright, Selenium, and xdist capabilities without importing Python packages into the platform kernel.
 * Author: Raushan Raj
 */
import type { AdapterDescriptor, AdapterHealth } from '../../../../packages/contracts/src/adapter';
import type {
  RuntimeAdapter,
  RuntimeCapabilitySet,
  RuntimeContext,
  RuntimeHealth,
  RuntimeInstanceIdentity,
  RuntimeLifecycleState,
} from '../../../../packages/contracts/src/runtime';
import {
  loadCompatibilityRegistry,
  probeProcess,
  resolveRuntimeCompatibility,
} from '../../../../packages/runtime/src';

export interface PythonRuntimeSnapshot {
  executable: string;
  version?: string;
  implementation?: string;
  platform?: string;
  packages: Record<string, string | undefined>;
}

export const descriptor: AdapterDescriptor = {
  id: 'runtime.python',
  kind: 'runtime',
  version: '1.0.0',
  displayName: 'Python Runtime',
  description: 'Python runtime and optional automation-package discovery adapter.',
  supportedLanguages: ['python'],
  supportedTools: ['python', 'pytest', 'playwright', 'selenium'],
  capabilities: [
    'runtime-health',
    'package-discovery',
    'pytest',
    'playwright-python',
    'selenium-python',
    'xdist',
  ],
};

const snapshotScript = [
  'import json, platform, sys',
  'from importlib.metadata import PackageNotFoundError, version',
  "names=['pytest','playwright','selenium','pytest-xdist']",
  'packages={}',
  'for name in names:',
  '  try: packages[name]=version(name)',
  '  except PackageNotFoundError: packages[name]=None',
  "print(json.dumps({'version':platform.python_version(),'implementation':platform.python_implementation(),'platform':platform.platform(),'packages':packages}))",
].join('\n');

export class PythonRuntimeAdapter implements RuntimeAdapter {
  readonly descriptor = descriptor;
  private state: RuntimeLifecycleState = 'created';
  private context: RuntimeContext = {};

  constructor(private readonly executable = process.env.QUALYNTRA_PYTHON_EXECUTABLE ?? 'python3') {}

  lifecycle(): RuntimeLifecycleState {
    return this.state;
  }

  async initialize(context: RuntimeContext = {}): Promise<void> {
    this.state = 'initializing';
    this.context = context;
    const health = await this.runtimeHealth(context);
    this.state = health.status === 'unavailable' ? 'degraded' : 'ready';
  }

  async shutdown(): Promise<void> {
    this.state = 'stopping';
    this.context = {};
    this.state = 'stopped';
  }

  async snapshot(context: RuntimeContext = this.context): Promise<PythonRuntimeSnapshot | undefined> {
    const result = await probeProcess(this.executable, ['-c', snapshotScript], {
      cwd: context.workingDirectory,
      env: context.environment,
      timeoutMs: 10_000,
    });
    if (!result.available || result.exitCode !== 0) return undefined;

    try {
      const parsed = JSON.parse(result.stdout.trim()) as Omit<PythonRuntimeSnapshot, 'executable'>;
      return { executable: this.executable, ...parsed };
    } catch {
      return undefined;
    }
  }

  async identity(context: RuntimeContext = this.context): Promise<RuntimeInstanceIdentity> {
    const snapshot = await this.snapshot(context);
    return {
      adapterId: descriptor.id,
      tool: 'python',
      detectedVersion: snapshot?.version,
      language: 'python',
      workingDirectory: context.workingDirectory ?? process.cwd(),
    };
  }

  async runtimeCapabilities(): Promise<RuntimeCapabilitySet> {
    const snapshot = await this.snapshot();
    return {
      processExecution: Boolean(snapshot),
      pytest: Boolean(snapshot?.packages.pytest),
      playwright: Boolean(snapshot?.packages.playwright),
      selenium: Boolean(snapshot?.packages.selenium),
      parallelPytest: Boolean(snapshot?.packages['pytest-xdist']),
      packageDiscovery: Boolean(snapshot),
      pythonVersion: snapshot?.version ?? 'unknown',
    };
  }

  async runtimeHealth(context: RuntimeContext = this.context): Promise<RuntimeHealth> {
    const snapshot = await this.snapshot(context);
    const identity = await this.identityFromSnapshot(snapshot, context);
    const registryRoot = context.metadata?.compatibilityRegistryRoot;
    const registry = loadCompatibilityRegistry(typeof registryRoot === 'string' ? registryRoot : process.cwd());
    const compatibility = resolveRuntimeCompatibility('python', snapshot?.version, registry);
    const components = [
      resolveRuntimeCompatibility('pytest', snapshot?.packages.pytest, registry),
      resolveRuntimeCompatibility('playwright', snapshot?.packages.playwright, registry),
      resolveRuntimeCompatibility('selenium', snapshot?.packages.selenium, registry),
    ];

    return {
      status: snapshot ? 'healthy' : 'unavailable',
      checkedAt: new Date().toISOString(),
      lifecycle: this.state,
      identity,
      compatibility,
      components,
      metadata: snapshot
        ? {
            implementation: snapshot.implementation,
            platform: snapshot.platform,
            packages: snapshot.packages,
          }
        : undefined,
      message: snapshot
        ? `Python ${snapshot.version ?? 'unknown'} detected; optional package availability is reported separately.`
        : `Python executable '${this.executable}' is unavailable or did not return valid runtime metadata.`,
    };
  }

  async health(): Promise<AdapterHealth> {
    const health = await this.runtimeHealth();
    return {
      status: health.status,
      checkedAt: health.checkedAt,
      message: health.message,
    };
  }

  private async identityFromSnapshot(
    snapshot: PythonRuntimeSnapshot | undefined,
    context: RuntimeContext,
  ): Promise<RuntimeInstanceIdentity> {
    return {
      adapterId: descriptor.id,
      tool: 'python',
      detectedVersion: snapshot?.version,
      language: 'python',
      workingDirectory: context.workingDirectory ?? process.cwd(),
    };
  }
}
