/**
 * File: packages/contracts/src/configuration.ts
 * Purpose: Defines brand-neutral runtime, control-plane, and security configuration settings.
 * Author: Raushan Raj
 */
export interface NetworkPolicy { allowNetwork:boolean; allowedHosts:string[]; }
export interface SecurityConfiguration { network:NetworkPolicy; redactKeys:string[]; persistPrompts:boolean; }
export interface ControlPlaneConfiguration { maxBodyBytes:number; maxPageSize:number; rateLimitPerMinute:number; corsOrigins:string[]; }

export interface OidcRoleMappingConfiguration { group:string; roleId:string; }
export interface OidcIdentityConfiguration {
  enabled:boolean; issuer?:string; audiences:string[]; discoveryUrl?:string;
  allowedAlgorithms:Array<'RS256'|'ES256'>; clockSkewSeconds:number; jwksCacheTtlSeconds:number; requestTimeoutMs:number; maxTokenBytes:number; maxTokenAgeSeconds?:number;
  acceptedTokenTypes:string[]; requireTokenType:boolean; allowInsecureLocalhost:boolean;
  groupClaim:string; organizationClaim:string; workspaceClaim?:string; projectClaim?:string; environmentClaim?:string; displayNameClaims:string[]; serviceSubjects:string[]; roleMappings:OidcRoleMappingConfiguration[];
}
export interface IdentityConfiguration { oidc:OidcIdentityConfiguration; }
export interface ArtifactStorageConfiguration { maxArtifactBytes:number; defaultRetentionDays:number; maxRetentionDays:number; maxDownloadGrantSeconds:number; }
export interface PlatformConfiguration { host:string; port:number; dataDir:string; logLevel:'debug'|'info'|'warn'|'error'; defaultProvider:string; security:SecurityConfiguration; controlPlane:ControlPlaneConfiguration; identity:IdentityConfiguration; artifacts:ArtifactStorageConfiguration; }
