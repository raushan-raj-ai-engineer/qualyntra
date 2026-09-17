/**
 * File: adapters/automation/playwright/src/index.ts
 * Purpose: Exposes Playwright automation capabilities and optional runtime diagnostics behind vendor-neutral Qualyntra contracts.
 * Author: Raushan Raj
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type {
  AutomationAdapter,
  AutomationCapabilities,
} from '../../../../packages/contracts/src/automation';
import type {
  AdapterDescriptor,
  AdapterHealth,
} from '../../../../packages/contracts/src/adapter';
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
  resolveRuntimeCompatibility,
} from '../../../../packages/runtime/src';

export const descriptor: AdapterDescriptor = {
  id: 'automation.playwright',
  kind: 'automation',
  version: '1.0.0',
  displayName: 'Playwright',
  description: 'Playwright automation and runtime capability adapter.',
  supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'dotnet'],
  supportedTools: ['playwright'],
  capabilities: [
    'web',
    'api',
    'tracing',
    'screenshots',
    'network-interception',
    'visual',
    'accessibility',
    'storage-state',
    'runtime-health',
    'compatibility-detection',
  ],
};

interface PackageMetadata {
  version?: string;
}

function detectPlaywrightVersion(workingDirectory: string): string | undefined {
  const packageFiles = [
    path.join(workingDirectory, 'node_modules', '@playwright', 'test', 'package.json'),
    path.join(workingDirectory, 'node_modules', 'playwright', 'package.json'),
  ];

  for (const packageFile of packageFiles) {
    if (!existsSync(packageFile)) continue;
    const metadata = JSON.parse(readFileSync(packageFile, 'utf8')) as PackageMetadata;
    if (metadata.version) return metadata.version;
  }

  return undefined;
}

export class PlaywrightAutomationAdapter implements AutomationAdapter, RuntimeAdapter {
  readonly id = descriptor.id;
  readonly descriptor = descriptor;
  private state: RuntimeLifecycleState = 'created';
  private context: RuntimeContext = {};

  capabilities(): AutomationCapabilities {
    return {
      web: true,
      mobile: false,
      api: true,
      tracing: true,
      screenshots: true,
      networkInterception: true,
      visualComparison: true,
      accessibility: true,
      storageState: true,
    };
  }

  describe(): Record<string, unknown> {
    return { ...descriptor };
  }

  lifecycle(): RuntimeLifecycleState {
    return this.state;
  }

  async initialize(context: RuntimeContext = {}): Promise<void> {
    this.state = 'initializing';
    this.context = context;
    const health = await this.runtimeHealth(context);
    this.state = health.status === 'healthy' ? 'ready' : 'degraded';
  }

  async shutdown(): Promise<void> {
    this.state = 'stopping';
    this.context = {};
    this.state = 'stopped';
  }

  async identity(context: RuntimeContext = this.context): Promise<RuntimeInstanceIdentity> {
    const workingDirectory = context.workingDirectory ?? process.cwd();
    return {
      adapterId: descriptor.id,
      tool: 'playwright',
      detectedVersion: detectPlaywrightVersion(workingDirectory),
      workingDirectory,
    };
  }

  async runtimeCapabilities(): Promise<RuntimeCapabilitySet> {
    const capabilities = this.capabilities();
    return {
      browserAutomation: capabilities.web,
      apiTesting: capabilities.api,
      mobileAutomation: capabilities.mobile,
      tracing: capabilities.tracing,
      screenshots: capabilities.screenshots,
      networkInterception: capabilities.networkInterception,
      visualComparison: capabilities.visualComparison,
      accessibility: capabilities.accessibility,
      storageState: capabilities.storageState,
    };
  }

  async runtimeHealth(context: RuntimeContext = this.context): Promise<RuntimeHealth> {
    const identity = await this.identity(context);
    const registryRoot = context.metadata?.compatibilityRegistryRoot;
    const workingDirectory = typeof registryRoot === 'string' ? registryRoot : process.cwd();
    const registry = loadCompatibilityRegistry(workingDirectory);
    const compatibility = resolveRuntimeCompatibility(
      identity.tool,
      identity.detectedVersion,
      registry,
    );
    const available = Boolean(identity.detectedVersion);

    return {
      status: available ? 'healthy' : 'unavailable',
      checkedAt: new Date().toISOString(),
      lifecycle: this.state,
      identity,
      compatibility,
      message: available
        ? `Playwright ${identity.detectedVersion} detected with ${compatibility.status} compatibility status.`
        : 'Playwright is not installed in the selected runtime workspace.',
    };
  }

  async health(): Promise<AdapterHealth> {
    const runtimeHealth = await this.runtimeHealth();
    return {
      status: runtimeHealth.status,
      checkedAt: runtimeHealth.checkedAt,
      message: runtimeHealth.message,
    };
  }
}
