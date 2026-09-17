/**
 * File: packages/providers/src/http.ts
 * Purpose: Provides an injectable HTTP transport with timeout support so provider adapters are testable without live network calls.
 * Author: Raushan Raj
 */
import { ProviderInvocationError, classifyHttpStatus } from './errors';

export interface ProviderHttpRequest {
  providerId: string;
  url: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  body?: string;
  timeoutMs?: number;
}

export interface ProviderHttpResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface ProviderHttpTransport {
  request(request: ProviderHttpRequest): Promise<ProviderHttpResponse>;
}

function responseHeaders(headers: Headers): Record<string, string> {
  const result: Record<string, string> = {};
  headers.forEach((value, key) => { result[key.toLowerCase()] = value; });
  return result;
}

export class FetchProviderHttpTransport implements ProviderHttpTransport {
  async request(request: ProviderHttpRequest): Promise<ProviderHttpResponse> {
    const controller = new AbortController();
    const timeout = request.timeoutMs && request.timeoutMs > 0
      ? setTimeout(() => controller.abort(), request.timeoutMs)
      : undefined;
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        signal: controller.signal,
      });
      const text = await response.text();
      let body: unknown = text;
      if (text) {
        try { body = JSON.parse(text); } catch { body = text; }
      }
      const headers = responseHeaders(response.headers);
      if (!response.ok) {
        const classification = classifyHttpStatus(response.status);
        throw new ProviderInvocationError(
          `Provider ${request.providerId} returned HTTP ${response.status}.`,
          classification.kind,
          request.providerId,
          classification.retryable,
          response.status,
          headers['x-request-id'] ?? headers['request-id'],
        );
      }
      return { status: response.status, headers, body };
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}

export function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}
