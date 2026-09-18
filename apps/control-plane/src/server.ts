/**
 * File: apps/control-plane/src/server.ts
 * Purpose: Boots the Qualyntra control-plane API with bootstrap bearer and optional enterprise OIDC authentication without identity-vendor coupling.
 * Author: Raushan Raj
 */
import { loadConfiguration } from '../../../packages/configuration/src/env';
import { AdapterRegistry } from '../../../packages/core/src/adapter-registry';
import { InMemoryAuditLog,RbacAuthorizer,GovernanceService } from '../../../packages/governance/src';
import { IntegrationService } from '../../../packages/integrations/src';
import { StaticBearerAuthenticator,FileBearerAuthenticator,FixedWindowRateLimiter,InMemoryControlPlaneRepository,ControlPlaneService,createBuiltInRoleCatalog,createControlPlaneServer } from '../../../packages/control-plane/src';
import { CompositeControlPlaneAuthenticator,MultiIssuerOidcAuthenticator,configuredOidcProvider } from '../../../packages/identity/src';
import { InMemoryTelemetryStore,InMemoryAlertStateStore,AlertEngine,ObservabilityService } from '../../../packages/observability/src';
import { NotificationService } from '../../../packages/notifications/src';
import { DistributedExecutionCoordinator,InMemoryDistributedExecutionQueue } from '../../../packages/distributed/src';
import { ArtifactService,InMemoryArtifactCatalog } from '../../../packages/artifacts/src';
import { LocalArtifactStorageAdapter } from '../../../adapters/storage/local/src';
import path from 'node:path';

const config=loadConfiguration();
const token=process.env.QUALYNTRA_API_TOKEN?.trim()||undefined;const tokenFile=process.env.QUALYNTRA_API_TOKEN_FILE?.trim()||undefined;const organizationId=process.env.QUALYNTRA_API_ORGANIZATION_ID?.trim()||undefined;const actorId=process.env.QUALYNTRA_API_ACTOR_ID??'local-service';
if(token&&tokenFile)throw new Error('Configure only one of QUALYNTRA_API_TOKEN_FILE or QUALYNTRA_API_TOKEN.');
const actor=organizationId?{id:actorId,type:'service' as const,assignments:[{roleId:'platform-admin',scope:{organizationId}}]}:undefined;
const agentToken=process.env.QUALYNTRA_AGENT_API_TOKEN?.trim()||undefined;const agentTokenFile=process.env.QUALYNTRA_AGENT_API_TOKEN_FILE?.trim()||undefined;const agentOrganizationId=process.env.QUALYNTRA_AGENT_API_ORGANIZATION_ID?.trim()||organizationId;const agentActorId=process.env.QUALYNTRA_AGENT_API_ACTOR_ID??'execution-agent';
if(agentToken&&agentTokenFile)throw new Error('Configure only one of QUALYNTRA_AGENT_API_TOKEN_FILE or QUALYNTRA_AGENT_API_TOKEN.');
const agentActor=agentOrganizationId?{id:agentActorId,type:'service' as const,assignments:[{roleId:'execution-agent',scope:{organizationId:agentOrganizationId}}]}:undefined;
const authenticators:any[]=[tokenFile?new FileBearerAuthenticator(tokenFile,actor):new StaticBearerAuthenticator(token,actor),agentTokenFile?new FileBearerAuthenticator(agentTokenFile,agentActor):new StaticBearerAuthenticator(agentToken,agentActor)];const oidc=configuredOidcProvider(config.identity.oidc,config.security.network);if(oidc)authenticators.push(new MultiIssuerOidcAuthenticator([oidc]));
const authenticator=new CompositeControlPlaneAuthenticator(authenticators);
const audit=new InMemoryAuditLog();const roles=createBuiltInRoleCatalog();const governance=new GovernanceService(new RbacAuthorizer(roles),audit);const registry=new AdapterRegistry();const integrations=new IntegrationService(registry,audit);const notifications=new NotificationService(registry,audit);const telemetry=new InMemoryTelemetryStore();const alertState=new InMemoryAlertStateStore();const observability=new ObservabilityService(telemetry,telemetry,new AlertEngine([],alertState,notifications),alertState);const repository=new InMemoryControlPlaneRepository();const distributedQueue=new InMemoryDistributedExecutionQueue();const distributedCoordinator=new DistributedExecutionCoordinator(distributedQueue,undefined,audit);const localArtifacts=new LocalArtifactStorageAdapter(path.join(config.dataDir,'artifacts'));registry.register(localArtifacts);const artifactService=new ArtifactService(registry,new InMemoryArtifactCatalog(),{...config.artifacts,redactKeys:config.security.redactKeys},audit);const service=new ControlPlaneService(repository,governance,registry,integrations,audit,observability,notifications,{coordinator:distributedCoordinator,queue:distributedQueue},{service:artifactService,storageAdapterId:localArtifacts.descriptor.id});const rateLimiter=new FixedWindowRateLimiter(config.controlPlane.rateLimitPerMinute);
const server=createControlPlaneServer({authenticator,governance,service,rateLimiter,options:{maxBodyBytes:config.controlPlane.maxBodyBytes,maxPageSize:config.controlPlane.maxPageSize,corsOrigins:config.controlPlane.corsOrigins},readiness:async()=>({ready:authenticator.configured(),checks:{authentication:authenticator.configured()?'configured':'not_configured',oidc:config.identity.oidc.enabled?'configured':'disabled',repository:'ready',distributedExecution:'ready',artifactStorage:(await localArtifacts.health()).status}})});
server.listen(config.port,config.host,()=>console.log(`Qualyntra control plane listening on ${config.host}:${config.port}`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));
