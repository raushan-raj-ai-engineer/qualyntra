/**
 * File: packages/providers/src/retry-policy.ts
 * Purpose: Computes bounded exponential retry delays with injectable randomness for deterministic tests.
 * Author: Raushan Raj
 */
import type { ProviderRetryPolicy } from '../../contracts/src/provider';

export const DEFAULT_PROVIDER_RETRY_POLICY: ProviderRetryPolicy = {
  maxAttempts: 2,
  baseDelayMs: 250,
  maxDelayMs: 5_000,
  backoffMultiplier: 2,
  jitterRatio: 0.2,
  retryableKinds: ['rate-limit', 'timeout', 'network', 'server-error', 'unavailable', 'unknown'],
};

export function retryDelayMs(policy: ProviderRetryPolicy, completedAttempt: number, random: () => number = Math.random): number {
  const exponential = Math.min(policy.maxDelayMs, policy.baseDelayMs * Math.pow(policy.backoffMultiplier, Math.max(0, completedAttempt - 1)));
  const jitter = exponential * Math.max(0, Math.min(1, policy.jitterRatio));
  const factor = (random() * 2) - 1;
  return Math.max(0, Math.round(exponential + (jitter * factor)));
}
