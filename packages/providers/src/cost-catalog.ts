/**
 * File: packages/providers/src/cost-catalog.ts
 * Purpose: Calculates optional model cost from externally supplied rates without hardcoding vendor pricing into Qualyntra.
 * Author: Raushan Raj
 */
import type { ProviderCostCatalog, ProviderCostRate } from '../../contracts/src/provider';

export class InMemoryCostCatalog implements ProviderCostCatalog {
  private readonly rates = new Map<string, ProviderCostRate>();
  set(providerId: string, model: string, rate: ProviderCostRate): void {
    this.rates.set(`${providerId}\u0000${model}`, { ...rate });
  }
  get(providerId: string, model: string): ProviderCostRate | undefined {
    return this.rates.get(`${providerId}\u0000${model}`);
  }
}

export function estimateCostUsd(rate: ProviderCostRate | undefined, inputTokens = 0, outputTokens = 0): number | undefined {
  if (!rate) return undefined;
  const input = rate.inputPerMillionUsd === undefined ? 0 : (inputTokens / 1_000_000) * rate.inputPerMillionUsd;
  const output = rate.outputPerMillionUsd === undefined ? 0 : (outputTokens / 1_000_000) * rate.outputPerMillionUsd;
  return input + output;
}
