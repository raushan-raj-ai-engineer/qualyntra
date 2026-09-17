/**
 * File: packages/core/src/ids.ts
 * Purpose: Provides dependency-free runtime identifier generation.
 * Author: Raushan Raj
 */
export function createId(prefix='q'):string { const random=Math.random().toString(36).slice(2,12); return `${prefix}_${Date.now().toString(36)}_${random}`; }
