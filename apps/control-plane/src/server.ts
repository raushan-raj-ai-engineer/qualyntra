/**
 * File: apps/control-plane/src/server.ts
 * Purpose: Boots the Qualyntra control-plane API with pluggable durable runtime backends, bootstrap bearer authentication, and optional enterprise OIDC.
 * Author: Raushan Raj
 */
import path from 'node:path';
import { loadConfiguration } from '../../../packages/configuration/src/env';
import { AdapterRegistry } from '../../../packages/core/src/adapter-registry';
import { RbacAuthorizer,GovernanceService } from '../../../packages/governance/src';
import { IntegrationService } from '../../../packages/integrations/src';
import { StaticBearerAuthenticator,FileBearerAuthenticator,FixedWindowRateLimiter,ControlPlaneService,createBuiltInRoleCatalog,createControlPlaneServer } from '../../../packages/control-plane/src';
import { CompositeControlPlaneAuthenticator,MultiIssuerOidcAuthenticator,configuredOidcProvider } from '../../../packages/identity/src';
import { AlertEngine,ObservabilityService } from '../../../packages/observability/src';
import { NotificationService } from '../../../packages/notifications/src';
import { DistributedExecutionCoordinator } from '../../../packages/distributed/src';
import { ArtifactService } from '../../../packages/artifacts/src';
import { LocalArtifactStorageAdapter } from '../../../adapters/storage/local/src';
import { createControlPlaneRuntimeBackends } from './runtime-backends';

async function main():Promise<void>{
  const config=loadConfiguration();
  const token=process.env.QUALYNTRA_API_TOKEN?.trim()||undefined;
  const tokenFile=process.env.QUALYNTRA_API_TOKEN_FILE?.trim()||undefined;
  const organizationId=process.env.QUALYNTRA_API_ORGANIZATION_ID?.trim()||undefined;
  const actorId=process.env.QUALYNTRA_API_ACTOR_ID??'local-service';
  if(token&&tokenFile)throw new Error('Configure only one of QUALYNTRA_API_TOKEN_FILE or QUALYNTRA_API_TOKEN.');
  const actor=organizationId?{id:actorId,type:'service' as const,assignments:[{roleId:'platform-admin',scope:{organizationId}}]}:undefined;

  const agentToken=process.env.QUALYNTRA_AGENT_API_TOKEN?.trim()||undefined;
  const agentTokenFile=process.env.QUALYNTRA_AGENT_API_TOKEN_FILE?.trim()||undefined;
  const agentOrganizationId=process.env.QUALYNTRA_AGENT_API_ORGANIZATION_ID?.trim()||organizationId;
  const agentActorId=process.env.QUALYNTRA_AGENT_API_ACTOR_ID??'execution-agent';
  if(agentToken&&agentTokenFile)throw new Error('Configure only one of QUALYNTRA_AGENT_API_TOKEN_FILE or QUALYNTRA_AGENT_API_TOKEN.');
  const agentActor=agentOrganizationId?{id:agentActorId,type:'service' as const,assignments:[{roleId:'execution-agent',scope:{organizationId:agentOrganizationId}}]}:undefined;

  const authenticators:any[]=[
    tokenFile?new FileBearerAuthenticator(tokenFile,actor):new StaticBearerAuthenticator(token,actor),
    agentTokenFile?new FileBearerAuthenticator(agentTokenFile,agentActor):new StaticBearerAuthenticator(agentToken,agentActor),
  ];
  const oidc=configuredOidcProvider(config.identity.oidc,config.security.network);
  if(oidc)authenticators.push(new MultiIssuerOidcAuthenticator([oidc]));
  const authenticator=new CompositeControlPlaneAuthenticator(authenticators);

  const backends=await createControlPlaneRuntimeBackends({sensitiveKeys:config.security.redactKeys,applicationVersion:'1.0.0'});
  const roles=createBuiltInRoleCatalog();
  const governance=new GovernanceService(new RbacAuthorizer(roles),backends.audit);
  const registry=new AdapterRegistry();
  const integrations=new IntegrationService(registry,backends.audit);
  const notifications=new NotificationService(registry,backends.audit);
  const alertEngine=new AlertEngine([],backends.alertState,notifications);
  const observability=new ObservabilityService(backends.telemetry,backends.telemetry,alertEngine,backends.alertState);
  const distributedCoordinator=new DistributedExecutionCoordinator(backends.distributedQueue,undefined,backends.audit);
  const recoveryIntervalMs=Number(process.env.QUALYNTRA_RUNTIME_RECOVERY_INTERVAL_MS??'15000');
  if(!Number.isInteger(recoveryIntervalMs)||recoveryIntervalMs<5_000||recoveryIntervalMs>300_000)throw new Error('QUALYNTRA_RUNTIME_RECOVERY_INTERVAL_MS must be an integer between 5000 and 300000.');
  await distributedCoordinator.recoverExpired();
  const recoveryTimer=setInterval(()=>{void distributedCoordinator.recoverExpired().catch(()=>console.warn('Distributed lease recovery iteration failed.'));},recoveryIntervalMs);(recoveryTimer as any).unref?.();

  const localArtifacts=new LocalArtifactStorageAdapter(path.join(config.dataDir,'artifacts'));
  registry.register(localArtifacts);
  const artifactService=new ArtifactService(registry,backends.artifactCatalog,{...config.artifacts,redactKeys:config.security.redactKeys},backends.audit);
  const service=new ControlPlaneService(backends.repository,governance,registry,integrations,backends.audit,observability,notifications,{coordinator:distributedCoordinator,queue:backends.distributedQueue},{service:artifactService,storageAdapterId:localArtifacts.descriptor.id});
  const rateLimiter=new FixedWindowRateLimiter(config.controlPlane.rateLimitPerMinute);

  const server=createControlPlaneServer({
    authenticator,governance,service,rateLimiter,
    options:{maxBodyBytes:config.controlPlane.maxBodyBytes,maxPageSize:config.controlPlane.maxPageSize,corsOrigins:config.controlPlane.corsOrigins},
    readiness:async()=>{const backendHealth=await backends.health();const artifactHealth=await localArtifacts.health();return{ready:authenticator.configured()&&backendHealth.status==='healthy'&&artifactHealth.status!=='unavailable',checks:{authentication:authenticator.configured()?'configured':'not_configured',oidc:config.identity.oidc.enabled?'configured':'disabled',runtimeBackend:`${backends.mode}:${backendHealth.status}`,repository:backendHealth.status==='healthy'?'ready':'unavailable',distributedExecution:backendHealth.status==='healthy'?'ready':'unavailable',artifactStorage:artifactHealth.status}};},
  });
  server.listen(config.port,config.host,()=>console.log(`Qualyntra control plane listening on ${config.host}:${config.port}`));

  let closing=false;
  const shutdown=async()=>{if(closing)return;closing=true;clearInterval(recoveryTimer);server.close(async()=>{try{await backends.close();}finally{process.exit(0);}});};
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{void shutdown();});
}

main().catch(error=>{console.error(error instanceof Error?error.message:'Control plane failed to start.');process.exit(1);});
