/**
 * File: packages/agent/src/lifecycle.ts
 * Purpose: Applies isolated workspaces, ephemeral secret materialization, disk limits, artifact publication, and cleanup around distributed runner execution.
 * Author: Raushan Raj
 */
import type { DistributedExecutionJob } from '../../contracts/src/distributed';
import type { ExecutionRequest,ExecutionResult } from '../../contracts/src/execution';
import type { SecretResolver } from '../../contracts/src/governance';
import type { WorkerAgentLifecycle } from '../../distributed/src/worker-agent';
import type { AgentControlPlaneClient } from './control-plane-client';
import { materializeExecutionSecrets } from './secrets';
import { AgentWorkspaceManager } from './workspace';
export class ExecutionAgentLifecycle implements WorkerAgentLifecycle{
  constructor(private readonly workspaces:AgentWorkspaceManager,private readonly resolvers:SecretResolver[],private readonly client?:AgentControlPlaneClient){}
  async prepare(job:DistributedExecutionJob):Promise<ExecutionRequest>{const cwd=await this.workspaces.prepare(job.id);const request=await materializeExecutionSecrets(job.request,this.resolvers);return{...request,cwd};}
  async afterResult(job:DistributedExecutionJob,result:ExecutionResult):Promise<ExecutionResult>{await this.workspaces.assertWithinLimit(job.id);if(!this.client||!result.resultFiles?.length)return result;const uploaded:string[]=[];const errors:string[]=[];for(const file of result.resultFiles){try{const resolved=this.workspaces.resolveResultFile(job.id,file);const record=await this.client.uploadArtifact({file:resolved,runId:job.runId,name:file,kind:'attachment',correlationId:typeof job.metadata?.correlationId==='string'?job.metadata.correlationId:undefined});uploaded.push(record.id);}catch(error){errors.push(error instanceof Error?error.message:'Artifact upload failed.');}}return{...result,metadata:{...(result.metadata??{}),artifactIds:uploaded,...(errors.length?{artifactUploadErrors:errors}:{})}};}
  async finalize(job:DistributedExecutionJob):Promise<void>{await this.workspaces.cleanup(job.id);}
}
