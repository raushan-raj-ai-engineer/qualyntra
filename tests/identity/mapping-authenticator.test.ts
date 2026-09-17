/**
 * File: tests/identity/mapping-authenticator.test.ts
 * Purpose: Verifies tenant-aware claim mapping, service identities, preconfigured multi-issuer routing, and authenticator composition.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { StaticBearerAuthenticator } from '../../packages/control-plane/src';
import { CompositeControlPlaneAuthenticator,IdentityMapper,MultiIssuerOidcAuthenticator,OidcJwtVerifier,OidcMetadataResolver } from '../../packages/identity/src';
import { FakeIdentityTransport,claims,providerConfig,signedToken } from './helpers';

const mapping={groupClaim:'groups',organizationClaim:'qualyntra_org',displayNameClaims:['name','email'],serviceSubjects:['svc-1'],roleMappings:[{group:'qe-admins',roleId:'platform-admin'},{group:'viewers',roleId:'quality-viewer'}]};
function oidc(transport=new FakeIdentityTransport()){const resolver=new OidcMetadataResolver(providerConfig,transport,{allowNetwork:true,allowedHosts:['issuer.example']});return new MultiIssuerOidcAuthenticator([{configuration:providerConfig,verifier:new OidcJwtVerifier(providerConfig,resolver),mapping}]);}

test('identity mapper converts verified groups and tenant claims into scoped RBAC assignments',()=>{const now=Math.floor(Date.now()/1000);const mapped=new IdentityMapper(mapping).map({issuer:providerConfig.issuer,subject:'svc-1',audiences:['qualyntra-api'],expiresAt:new Date((now+60)*1000).toISOString(),claims:claims({sub:'svc-1',groups:['qe-admins','viewers']})});assert.equal(mapped.actor.type,'service');assert.equal(mapped.actor.assignments.length,2);assert.equal(mapped.actor.assignments[0]!.scope.organizationId,'org-1');});
test('identity mapper fails closed when verified token has no organization boundary',()=>{const now=Math.floor(Date.now()/1000);assert.throws(()=>new IdentityMapper(mapping).map({issuer:providerConfig.issuer,subject:'user',audiences:['qualyntra-api'],expiresAt:new Date((now+60)*1000).toISOString(),claims:claims({qualyntra_org:undefined})}),/organization claim/);});
test('multi-issuer authenticator never performs discovery for an unconfigured issuer selected by an untrusted token',async()=>{const transport=new FakeIdentityTransport();const auth=oidc(transport);assert.equal(await auth.authenticate({authorization:`Bearer ${signedToken(claims({iss:'https://unknown.example'}))}`}),undefined);assert.equal(transport.calls.length,0);});
test('composite authentication allows bootstrap bearer and OIDC without coupling either mechanism',async()=>{const actor={id:'bootstrap',type:'service' as const,assignments:[{roleId:'platform-admin',scope:{organizationId:'org-1'}}]};const auth=new CompositeControlPlaneAuthenticator([new StaticBearerAuthenticator('bootstrap-token',actor),oidc()]);assert.equal((await auth.authenticate({authorization:'Bearer bootstrap-token'}))?.actor.id,'bootstrap');const principal=await auth.authenticate({authorization:`Bearer ${signedToken(claims())}`});assert.equal(principal?.authenticationMethod,'oidc-jwt');assert.equal(principal?.actor.assignments[0]?.roleId,'platform-admin');});
