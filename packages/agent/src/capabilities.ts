/**
 * File: packages/agent/src/capabilities.ts
 * Purpose: Discovers worker scheduling capabilities from registered runner adapters and host metadata without runner-specific execution logic.
 * Author: Raushan Raj
 */
import * as os from 'node:os';
import type { AdapterRegistry } from '../../core/src/adapter-registry';
import type { WorkerCapabilities } from '../../contracts/src/distributed';
function unique(values:string[]):string[]{return [...new Set(values.filter(Boolean))].sort();}
export interface AgentCapabilityDiscoveryInput { labels?:string[]; languages?:string[]; engines?:string[]; }
export async function discoverAgentCapabilities(registry:AdapterRegistry,input:AgentCapabilityDiscoveryInput={}):Promise<{capabilities:WorkerCapabilities;metadata:Record<string,string>}>{const available=[];for(const adapter of registry.list('runner')){const health=await adapter.health();if(health.status!=='unavailable')available.push(adapter);}const runners=available.map(adapter=>adapter.descriptor.id.replace(/^runner\./,''));const languages=unique([...(input.languages??[]),...available.flatMap(adapter=>adapter.descriptor.supportedLanguages??[])]);return{capabilities:{languages,runners:unique(runners),engines:unique(input.engines??[]),labels:unique(input.labels??[]),operatingSystems:[os.platform()]},metadata:{hostname:os.hostname(),platform:os.platform(),architecture:os.arch(),release:os.release(),runnerCount:String(runners.length)}};}
