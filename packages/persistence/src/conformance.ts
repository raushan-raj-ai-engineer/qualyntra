/**
 * File: packages/persistence/src/conformance.ts
 * Purpose: Provides reusable repository-conformance assertions so storage adapters can be checked against the same control-plane behavior.
 * Author: Raushan Raj
 */
import type { ControlPlaneRepository,RunRecord } from '../../contracts/src/control-plane';
import type { TenantScope } from '../../contracts/src/governance';

export interface RepositoryConformanceResult { checks:string[]; }
function run(id:string,scope:TenantScope,key?:string):RunRecord{return{id,scope,request:{runId:id,projectId:scope.projectId??'project',runtime:{language:'typescript',runner:'playwright-test'}},status:'queued',createdAt:'2026-09-17T00:00:00.000Z',updatedAt:'2026-09-17T00:00:00.000Z',version:1,idempotencyKey:key,requestFingerprint:`fp-${id}`};}
export async function verifyControlPlaneRepositoryConformance(repository:ControlPlaneRepository):Promise<RepositoryConformanceResult>{
  const checks:string[]=[];const p1={organizationId:'org',workspaceId:'ws',projectId:'p1'};const p2={organizationId:'org',workspaceId:'ws',projectId:'p2'};
  await repository.createRun(run('conformance-r1',p1,'same'));await repository.createRun(run('conformance-r2',p2,'same'));
  if((await repository.findRunByIdempotency(p2,'same'))?.id!=='conformance-r2')throw new Error('Repository failed exact-scope idempotency conformance.');checks.push('idempotency-scope');
  const visible=await repository.listRuns({organizationId:'org',workspaceId:'ws'},{offset:0,limit:10});if(visible.total!==2)throw new Error('Repository failed hierarchical tenant visibility conformance.');checks.push('tenant-visibility');
  const updated=await repository.updateRunStatus('conformance-r1',p1,1,'running');if(updated.version!==2||updated.status!=='running')throw new Error('Repository failed optimistic version increment conformance.');checks.push('optimistic-version');
  return{checks};
}
