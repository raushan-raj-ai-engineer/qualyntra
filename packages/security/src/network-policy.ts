/**
 * File: packages/security/src/network-policy.ts
 * Purpose: Enforces opt-in outbound network access and optional host allowlisting.
 * Author: Raushan Raj
 */
import type { NetworkPolicy } from '../../contracts/src/configuration';
export function assertNetworkAllowed(url:string,policy:NetworkPolicy):void { if(!policy.allowNetwork) throw new Error('Outbound network access is disabled by policy.'); const host=new URL(url).host; if(policy.allowedHosts.length&&!policy.allowedHosts.includes(host)) throw new Error(`Outbound host is not allowlisted: ${host}`); }

