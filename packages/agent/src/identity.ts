/**
 * File: packages/agent/src/identity.ts
 * Purpose: Persists a stable generated worker identity locally without storing authentication credentials.
 * Author: Raushan Raj
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createId } from '../../core/src/ids';
export class FileAgentIdentityStore{
  constructor(private readonly dataDir:string){}
  async loadOrCreate():Promise<string>{await fs.mkdir(this.dataDir,{recursive:true,mode:0o700});const file=path.join(this.dataDir,'worker-id');try{return this.validate((await fs.readFile(file,'utf8')).trim());}catch(error:any){if(error?.code!=='ENOENT')throw error;}const id=createId('worker');try{await fs.writeFile(file,`${id}\n`,{encoding:'utf8',mode:0o600,flag:'wx'});return id;}catch(error:any){if(error?.code!=='EEXIST')throw error;return this.validate((await fs.readFile(file,'utf8')).trim());}}
  private validate(value:string):string{if(!/^worker_[A-Za-z0-9-]+$/.test(value))throw new Error('Persisted worker identity is invalid.');return value;}
}
