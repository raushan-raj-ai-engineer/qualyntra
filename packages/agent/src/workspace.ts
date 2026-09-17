/**
 * File: packages/agent/src/workspace.ts
 * Purpose: Creates tenant-independent isolated per-job workspaces, enforces disk-size boundaries, and safely cleans execution output.
 * Author: Raushan Raj
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
export class AgentWorkspaceManager{
  constructor(private readonly root:string,private readonly maxBytes:number,private readonly cleanupEnabled=true){if(maxBytes<1)throw new Error('Agent workspace maxBytes must be positive.');}
  async prepare(jobId:string):Promise<string>{const dir=this.resolve(jobId);await fs.rm(dir,{recursive:true,force:true});await fs.mkdir(dir,{recursive:true,mode:0o700});return dir;}
  async assertWithinLimit(jobId:string):Promise<number>{const bytes=await this.size(this.resolve(jobId));if(bytes>this.maxBytes)throw new Error(`Execution workspace exceeds configured size limit (${bytes} > ${this.maxBytes} bytes).`);return bytes;}
  resolveResultFile(jobId:string,value:string):string{const dir=this.resolve(jobId);const file=path.resolve(dir,value);if(file!==dir&&!file.startsWith(`${dir}${path.sep}`))throw new Error('Runner result file escapes isolated workspace.');return file;}
  async cleanup(jobId:string):Promise<void>{if(this.cleanupEnabled)await fs.rm(this.resolve(jobId),{recursive:true,force:true});}
  private resolve(jobId:string):string{if(!/^job_[A-Za-z0-9-]+$/.test(jobId))throw new Error('Distributed job id is invalid for workspace allocation.');const root=path.resolve(this.root);const dir=path.resolve(root,jobId);if(!dir.startsWith(`${root}${path.sep}`))throw new Error('Execution workspace escapes configured root.');return dir;}
  private async size(target:string):Promise<number>{let total=0;for(const entry of await fs.readdir(target,{withFileTypes:true})){const file=path.join(target,entry.name);const stat=await fs.lstat(file);if(stat.isSymbolicLink())throw new Error('Symbolic links are not allowed in execution workspaces.');if(stat.isDirectory())total+=await this.size(file);else if(stat.isFile())total+=stat.size;if(total>this.maxBytes)return total;}return total;}
}
