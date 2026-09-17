/**
 * File: packages/contracts/src/provider.ts
 * Purpose: Defines vendor-neutral routing, retry, alias, telemetry, cost, and provider-error contracts for multi-LLM execution.
 * Author: Raushan Raj
 */
import type { ModelProviderCapabilities } from './evaluation';

export type ProviderErrorKind =
  | 'authentication'
  | 'authorization'
  | 'rate-limit'
  | 'timeout'
  | 'network'
  | 'invalid-request'
  | 'content-filter'
  | 'server-error'
  | 'unavailable'
  | 'unknown';

export interface ProviderRetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterRatio: number;
  retryableKinds: ProviderErrorKind[];
}

export interface ModelRouteCandidate {
  providerId: string;
  model: string;
  priority?: number;
  maxAttempts?: number;
  requiredCapabilities?: Array<keyof ModelProviderCapabilities>;
}

export interface ModelAliasDefinition {
  alias: string;
  candidates: ModelRouteCandidate[];
  metadata?: Record<string, unknown>;
}

export interface ProviderCostRate {
  inputPerMillionUsd?: number;
  outputPerMillionUsd?: number;
}

export interface ProviderCostCatalog {
  get(providerId: string, model: string): ProviderCostRate | undefined;
}

export interface ProviderAttemptTelemetry {
  alias: string;
  providerId: string;
  model: string;
  fallbackIndex: number;
  attempt: number;
  success: boolean;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  costUsd?: number;
  requestId?: string;
  errorKind?: ProviderErrorKind;
  statusCode?: number;
}

export interface ProviderTelemetrySink {
  record(event: ProviderAttemptTelemetry): void | Promise<void>;
}

export interface ProviderRoutingPolicy {
  retry: ProviderRetryPolicy;
  requireHealthyProvider: boolean;
  allowDegradedProvider: boolean;
  fallbackOnKinds: ProviderErrorKind[];
}

export interface ProviderRouteHealth {
  alias: string;
  status: 'healthy' | 'degraded' | 'unavailable';
  candidates: Array<{
    providerId: string;
    model: string;
    status: 'healthy' | 'degraded' | 'unavailable';
    message?: string;
  }>;
}
