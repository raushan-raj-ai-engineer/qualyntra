/**
 * File: packages/providers/src/adapter-utils.ts
 * Purpose: Supplies shared endpoint validation, capability merging, health, and response-header helpers for vendor adapters.
 * Author: Raushan Raj
 */
import type { ModelProviderCapabilities, ProviderHealth } from '../../contracts/src/evaluation';
import type { NetworkPolicy } from '../../contracts/src/configuration';
import { assertNetworkAllowed } from '../../security/src/network-policy';

export const TEXT_CHAT_CAPABILITIES: ModelProviderCapabilities = {
  chat: true,
  streaming: false,
  embeddings: false,
  jsonMode: false,
  tools: false,
  multimodal: false,
};

export function capabilitiesWith(base: ModelProviderCapabilities, overrides?: Partial<ModelProviderCapabilities>): ModelProviderCapabilities {
  return { ...base, ...overrides };
}

export function configuredHealth(baseUrl: string, networkPolicy: NetworkPolicy, credentialPresent: boolean, credentialMessage = 'Provider credential is not configured.'): ProviderHealth {
  try {
    if (!credentialPresent) return { status: 'unavailable', message: credentialMessage, checkedAt: new Date().toISOString() };
    assertNetworkAllowed(baseUrl, networkPolicy);
    return { status: 'healthy', message: 'Provider endpoint and credential configuration are present; no billable inference probe was sent.', checkedAt: new Date().toISOString() };
  } catch (error) {
    return { status: 'unavailable', message: error instanceof Error ? error.message : String(error), checkedAt: new Date().toISOString() };
  }
}

export function endpoint(baseUrl: string, path: string): string {
  const normalized = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return new URL(path.replace(/^\//, ''), normalized).toString();
}

export function header(headers: Record<string, string>, ...names: string[]): string | undefined {
  for (const name of names) {
    const value = headers[name.toLowerCase()] ?? headers[name];
    if (value) return value;
  }
  return undefined;
}
