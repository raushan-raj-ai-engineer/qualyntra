/**
 * File: packages/providers/src/model-alias.ts
 * Purpose: Registers logical model aliases and validates deterministic provider/model candidate routing definitions.
 * Author: Raushan Raj
 */
import type { ModelAliasDefinition } from '../../contracts/src/provider';

export class ModelAliasRegistry {
  private readonly aliases = new Map<string, ModelAliasDefinition>();

  register(definition: ModelAliasDefinition): void {
    const alias = definition.alias.trim();
    if (!alias) throw new Error('Model alias must not be empty.');
    if (this.aliases.has(alias)) throw new Error(`Model alias already registered: ${alias}`);
    if (!definition.candidates.length) throw new Error(`Model alias ${alias} must have at least one candidate.`);
    const seen = new Set<string>();
    for (const candidate of definition.candidates) {
      if (!candidate.providerId.trim() || !candidate.model.trim()) {
        throw new Error(`Model alias ${alias} contains an empty provider or model.`);
      }
      const key = `${candidate.providerId}\u0000${candidate.model}`;
      if (seen.has(key)) throw new Error(`Model alias ${alias} contains duplicate candidate ${candidate.providerId}/${candidate.model}.`);
      seen.add(key);
    }
    this.aliases.set(alias, { ...definition, alias });
  }

  get(alias: string): ModelAliasDefinition {
    const definition = this.aliases.get(alias);
    if (!definition) throw new Error(`Model alias not registered: ${alias}`);
    return definition;
  }

  list(): ModelAliasDefinition[] { return [...this.aliases.values()]; }
}
