/**
 * File: packages/runtime/src/registry-loader.ts
 * Purpose: Loads compatibility registry data from disk so version policy remains configuration-driven instead of hardcoded in platform code.
 * Author: Raushan Raj
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { CompatibilityRegistry } from '../../contracts/src/runtime';

export function loadCompatibilityRegistry(
  workingDirectory: string = process.cwd(),
): CompatibilityRegistry {
  const registryPath = path.join(workingDirectory, 'compatibility', 'registry.json');
  return JSON.parse(readFileSync(registryPath, 'utf8')) as CompatibilityRegistry;
}
