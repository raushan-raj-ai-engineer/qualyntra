/**
 * File: packages/core/src/capability-resolver.ts
 * Purpose: Resolves adapter capabilities so orchestration uses features rather than vendor-version conditionals.
 * Author: Raushan Raj
 */
import type { Adapter } from '../../contracts/src/adapter';
export function supports(adapter:Adapter, capability:string):boolean { return adapter.descriptor.capabilities.includes(capability); }
export function requireCapabilities(adapter:Adapter, required:string[]):void { const missing=required.filter(c=>!supports(adapter,c)); if(missing.length) throw new Error(`Adapter ${adapter.descriptor.id} lacks capabilities: ${missing.join(', ')}`); }

