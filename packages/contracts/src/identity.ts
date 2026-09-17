/**
 * File: packages/contracts/src/identity.ts
 * Purpose: Defines vendor-neutral enterprise identity, OIDC/JWT verification, claim mapping, and identity-provider contracts.
 * Author: Raushan Raj
 */
import type { ActorIdentity,TenantScope } from './governance';

export type JwtAlgorithm='RS256'|'ES256';

export interface IdentityHttpRequest { url:string; timeoutMs:number; }
export interface IdentityHttpResponse { status:number; body:unknown; headers:Record<string,string>; }
export interface IdentityHttpTransport { get(request:IdentityHttpRequest):Promise<IdentityHttpResponse>; }

export interface OidcProviderConfiguration {
  id:string;
  issuer:string;
  audiences:string[];
  discoveryUrl?:string;
  allowedAlgorithms:JwtAlgorithm[];
  clockSkewSeconds:number;
  jwksCacheTtlSeconds:number;
  requestTimeoutMs:number;
  maxTokenBytes:number;
  maxTokenAgeSeconds?:number;
  requiredClaims?:string[];
  acceptedTokenTypes?:string[];
  requireTokenType?:boolean;
  allowInsecureLocalhost?:boolean;
}

export interface OidcDiscoveryDocument {
  issuer:string;
  jwks_uri:string;
  authorization_endpoint?:string;
  token_endpoint?:string;
  id_token_signing_alg_values_supported?:string[];
}

export interface JsonWebKey {
  kid?:string;
  kty:string;
  use?:string;
  alg?:string;
  n?:string;
  e?:string;
  crv?:string;
  x?:string;
  y?:string;
  [key:string]:unknown;
}

export interface JsonWebKeySet { keys:JsonWebKey[]; }

export interface VerifiedJwt {
  issuer:string;
  subject:string;
  audiences:string[];
  expiresAt:string;
  issuedAt?:string;
  tokenId?:string;
  claims:Record<string,unknown>;
}

export interface IdentityRoleMapping { group:string; roleId:string; }
export interface IdentityMappingPolicy {
  groupClaim:string;
  organizationClaim:string;
  workspaceClaim?:string;
  projectClaim?:string;
  environmentClaim?:string;
  displayNameClaims:string[];
  serviceSubjects:string[];
  roleMappings:IdentityRoleMapping[];
}

export interface EnterpriseIdentity {
  actor:ActorIdentity;
  scope:TenantScope;
  issuer:string;
  subject:string;
  expiresAt:string;
  tokenId?:string;
  groups:string[];
}
