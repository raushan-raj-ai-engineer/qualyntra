/**
 * File: packages/contracts/src/runtime.ts
 * Purpose: Defines vendor-neutral runtime lifecycle, identity, capability, compatibility, and health contracts.
 * Author: Raushan Raj
 */
import type { Adapter, AdapterHealth } from './adapter';

export type RuntimeLifecycleState =
  | 'created'
  | 'initializing'
  | 'ready'
  | 'degraded'
  | 'stopping'
  | 'stopped'
  | 'failed';

export type RuntimeCompatibilityStatus =
  | 'certified'
  | 'candidate'
  | 'reference'
  | 'uncertified'
  | 'unknown';

export interface RuntimeInstanceIdentity {
  adapterId: string;
  tool: string;
  detectedVersion?: string;
  language?: string;
  workingDirectory?: string;
}

export interface RuntimeCapabilitySet {
  [capability: string]: boolean | string | number | string[];
}

export interface ToolCompatibilityPolicy {
  referenceBaseline?: string;
  certified: string[];
  candidate?: string | null;
  policy: string;
}

export interface CompatibilityRegistry {
  platformVersion: string;
  tools: Record<string, ToolCompatibilityPolicy>;
}

export interface RuntimeCompatibility {
  tool: string;
  detectedVersion?: string;
  status: RuntimeCompatibilityStatus;
  policy?: string;
  referenceBaseline?: string;
  reason: string;
}

export interface RuntimeContext {
  workingDirectory?: string;
  environment?: Record<string, string | undefined>;
  metadata?: Record<string, unknown>;
}

export interface RuntimeHealth extends AdapterHealth {
  lifecycle: RuntimeLifecycleState;
  identity: RuntimeInstanceIdentity;
  compatibility: RuntimeCompatibility;
  components?: RuntimeCompatibility[];
  metadata?: Record<string, unknown>;
}

export interface RuntimeAdapter extends Adapter {
  initialize(context?: RuntimeContext): Promise<void>;
  shutdown(): Promise<void>;
  lifecycle(): RuntimeLifecycleState;
  identity(context?: RuntimeContext): Promise<RuntimeInstanceIdentity>;
  runtimeCapabilities(): Promise<RuntimeCapabilitySet>;
  runtimeHealth(context?: RuntimeContext): Promise<RuntimeHealth>;
}
