/**
 * File: packages/identity/src/config.ts
 * Purpose: Builds OIDC provider and claim-mapping configuration from validated platform settings without embedding identity-provider-specific values.
 * Author: Raushan Raj
 */
import type { NetworkPolicy,OidcIdentityConfiguration } from '../../contracts/src/configuration';
import type { IdentityMappingPolicy,OidcProviderConfiguration } from '../../contracts/src/identity';
import { OidcMetadataResolver } from './oidc-discovery';
import { FetchIdentityHttpTransport } from './http';
import { OidcJwtVerifier } from './verifier';
import type { OidcAuthenticatorProvider } from './authenticator';

export function configuredOidcProvider(config:OidcIdentityConfiguration,network:NetworkPolicy):OidcAuthenticatorProvider|undefined{
  if(!config.enabled)return undefined;
  if(!config.issuer||config.audiences.length===0)throw new Error('OIDC issuer and at least one audience are required when enterprise identity is enabled');
  const provider:OidcProviderConfiguration={id:'configured-oidc',issuer:config.issuer,audiences:config.audiences,discoveryUrl:config.discoveryUrl,allowedAlgorithms:config.allowedAlgorithms,clockSkewSeconds:config.clockSkewSeconds,jwksCacheTtlSeconds:config.jwksCacheTtlSeconds,requestTimeoutMs:config.requestTimeoutMs,maxTokenBytes:config.maxTokenBytes,maxTokenAgeSeconds:config.maxTokenAgeSeconds,acceptedTokenTypes:config.acceptedTokenTypes,requireTokenType:config.requireTokenType,allowInsecureLocalhost:config.allowInsecureLocalhost};
  const transport=new FetchIdentityHttpTransport();const resolver=new OidcMetadataResolver(provider,transport,network);const verifier=new OidcJwtVerifier(provider,resolver);
  const mapping:IdentityMappingPolicy={groupClaim:config.groupClaim,organizationClaim:config.organizationClaim,workspaceClaim:config.workspaceClaim,projectClaim:config.projectClaim,environmentClaim:config.environmentClaim,displayNameClaims:config.displayNameClaims,serviceSubjects:config.serviceSubjects,roleMappings:config.roleMappings};
  return{configuration:provider,verifier,mapping};
}
