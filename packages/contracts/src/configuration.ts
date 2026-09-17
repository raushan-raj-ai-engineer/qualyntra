/**
 * File: packages/contracts/src/configuration.ts
 * Purpose: Defines brand-neutral runtime, control-plane, and security configuration settings.
 * Author: Raushan Raj
 */
export interface NetworkPolicy { allowNetwork:boolean; allowedHosts:string[]; }
export interface SecurityConfiguration { network:NetworkPolicy; redactKeys:string[]; persistPrompts:boolean; }
export interface ControlPlaneConfiguration { maxBodyBytes:number; maxPageSize:number; rateLimitPerMinute:number; corsOrigins:string[]; }
export interface PlatformConfiguration { host:string; port:number; dataDir:string; logLevel:'debug'|'info'|'warn'|'error'; defaultProvider:string; security:SecurityConfiguration; controlPlane:ControlPlaneConfiguration; }
