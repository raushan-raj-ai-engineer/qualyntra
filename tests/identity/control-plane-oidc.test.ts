/**
 * File: tests/identity/control-plane-oidc.test.ts
 * Purpose: Verifies a signed OIDC bearer token reaches the real control-plane RBAC path and cannot cross its mapped organization boundary.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { AdapterRegistry } from '../../packages/core/src/adapter-registry';
import { InMemoryAuditLog,RbacAuthorizer,GovernanceService } from '../../packages/governance/src';
import { IntegrationService } from '../../packages/integrations/src';
import { ControlPlaneService,FixedWindowRateLimiter,InMemoryControlPlaneRepository,createBuiltInRoleCatalog,createControlPlaneServer } from '../../packages/control-plane/src';
import { MultiIssuerOidcAuthenticator,OidcJwtVerifier,OidcMetadataResolver } from '../../packages/identity/src';
import { FakeIdentityTransport,claims,providerConfig,signedToken } from './helpers';

test('OIDC principal is authorized only inside its claim-mapped organization',async(t:any)=>{
  const resolver=new OidcMetadataResolver(providerConfig,new FakeIdentityTransport(),{allowNetwork:true,allowedHosts:['issuer.example']});
  const authenticator=new MultiIssuerOidcAuthenticator([{configuration:providerConfig,verifier:new OidcJwtVerifier(providerConfig,resolver),mapping:{groupClaim:'groups',organizationClaim:'qualyntra_org',displayNameClaims:['name'],serviceSubjects:[],roleMappings:[{group:'qe-admins',roleId:'platform-admin'}]}}]);
  const audit=new InMemoryAuditLog(),governance=new GovernanceService(new RbacAuthorizer(createBuiltInRoleCatalog()),audit),registry=new AdapterRegistry(),service=new ControlPlaneService(new InMemoryControlPlaneRepository(),governance,registry,new IntegrationService(registry),audit);
  const server=createControlPlaneServer({authenticator,governance,service,rateLimiter:new FixedWindowRateLimiter(100),options:{maxBodyBytes:4096,maxPageSize:25,corsOrigins:[]}});await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});t.after(()=>server.close());
  const address=server.address(),port=typeof address==='object'&&address?address.port:0,token=signedToken(claims());
  const allowed=await fetch(`http://127.0.0.1:${port}/api/v1/capabilities`,{headers:{authorization:`Bearer ${token}`,'x-qualyntra-organization-id':'org-1'}});assert.equal(allowed.status,200);
  const denied=await fetch(`http://127.0.0.1:${port}/api/v1/capabilities`,{headers:{authorization:`Bearer ${token}`,'x-qualyntra-organization-id':'org-2'}});assert.equal(denied.status,403);
});
