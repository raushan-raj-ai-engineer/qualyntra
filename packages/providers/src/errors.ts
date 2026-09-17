/**
 * File: packages/providers/src/errors.ts
 * Purpose: Normalizes provider failures into safe retry/fallback categories without exposing credentials or vendor response bodies.
 * Author: Raushan Raj
 */
import type { ProviderErrorKind } from '../../contracts/src/provider';

export class ProviderInvocationError extends Error {
  constructor(
    message: string,
    public readonly kind: ProviderErrorKind,
    public readonly providerId: string,
    public readonly retryable: boolean,
    public readonly statusCode?: number,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ProviderInvocationError';
  }
}

export function classifyHttpStatus(status: number): { kind: ProviderErrorKind; retryable: boolean } {
  if (status === 401) return { kind: 'authentication', retryable: false };
  if (status === 403) return { kind: 'authorization', retryable: false };
  if (status === 408 || status === 504) return { kind: 'timeout', retryable: true };
  if (status === 429) return { kind: 'rate-limit', retryable: true };
  if (status >= 500) return { kind: 'server-error', retryable: true };
  if (status >= 400) return { kind: 'invalid-request', retryable: false };
  return { kind: 'unknown', retryable: false };
}

export function normalizeProviderError(providerId: string, error: unknown): ProviderInvocationError {
  if (error instanceof ProviderInvocationError) return error;
  if (error instanceof Error && error.name === 'AbortError') {
    return new ProviderInvocationError(`Provider ${providerId} timed out.`, 'timeout', providerId, true);
  }
  const message = error instanceof Error ? error.message : String(error);
  return new ProviderInvocationError(`Provider ${providerId} failed: ${message}`, 'unknown', providerId, true);
}
