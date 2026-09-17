/**
 * File: apps/control-plane/src/server.ts
 * Purpose: Boots the Qualyntra control-plane API with bootstrap bearer and optional enterprise OIDC authentication without identity-vendor coupling.
 * Author: Raushan Raj
 */
import { loadConfiguration } from '../../../packages/configuration/src/env';
import { AdapterRegistry } from '../../../packages/core/src/adapter-registry';
import { InMemoryAuditLog,RbacAuthorizer,GovernanceService } from '../../../packages/governance/src';
import { IntegrationService } from '../../../packages/integrations/src';
import { StaticBearerAuthenticator,FixedWindowRateLimiter,InMemoryControlPlaneRepository,ControlPlaneService,createBuiltInRoleCatalog,createControlPlaneServer } from '../../../packages/control-plane/src';
import { CompositeControlPlaneAuthenticator,MultiIssuerOidcAuthenticator,configuredOidcProvider } from '../../../packages/identity/src';

const config=loadConfiguration();
const token=process.env.QUALYNTRA_API_TOKEN;const organizationId=process.env.QUALYNTRA_API_ORGANIZATION_ID;const actorId=process.env.QUALYNTRA_API_ACTOR_ID??'local-service';
const actor=token&&organizationId?{id:actorId,type:'service' as const,assignments:[{roleId:'platform-admin',scope:{organizationId}}]}:undefined;
const authenticators:any[]=[new StaticBearerAuthenticator(token,actor)];const oidc=configuredOidcProvider(config.identity.oidc,config.security.network);if(oidc)authenticators.push(new MultiIssuerOidcAuthenticator([oidc]));
const authenticator=new CompositeControlPlaneAuthenticator(authenticators);
const audit=new InMemoryAuditLog();const roles=createBuiltInRoleCatalog();const governance=new GovernanceService(new RbacAuthorizer(roles),audit);const registry=new AdapterRegistry();const integrations=new IntegrationService(registry,audit);const repository=new InMemoryControlPlaneRepository();const service=new ControlPlaneService(repository,governance,registry,integrations,audit);const rateLimiter=new FixedWindowRateLimiter(config.controlPlane.rateLimitPerMinute);
const server=createControlPlaneServer({authenticator,governance,service,rateLimiter,options:{maxBodyBytes:config.controlPlane.maxBodyBytes,maxPageSize:config.controlPlane.maxPageSize,corsOrigins:config.controlPlane.corsOrigins},readiness:async()=>({ready:authenticator.configured(),checks:{authentication:authenticator.configured()?'configured':'not_configured',oidc:config.identity.oidc.enabled?'configured':'disabled',repository:'ready'}})});
server.listen(config.port,config.host,()=>console.log(`Qualyntra control plane listening on ${config.host}:${config.port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
