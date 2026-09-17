/**
 * File: packages/core/src/ids.ts
 * Purpose: Provides dependency-free cryptographically strong runtime identifier generation.
 * Author: Raushan Raj
 */
import { randomUUID } from 'node:crypto';
export function createId(prefix='q'):string { return `${prefix}_${randomUUID()}`; }
