/**
 * File: packages/agent/src/credentials.ts
 * Purpose: Resolves the execution-agent bearer credential at request time so rotated file-mounted secrets do not require process restart.
 * Author: Raushan Raj
 */
import { promises as fs } from 'node:fs';
import type { ExecutionAgentConfiguration } from './config';
export type AgentTokenProvider=()=>Promise<string>;
export function createAgentTokenProvider(config:Pick<ExecutionAgentConfiguration,'token'|'tokenFile'>):AgentTokenProvider{
  if(config.tokenFile)return async()=>{const value=(await fs.readFile(config.tokenFile!,'utf8')).trim();if(!value)throw new Error('Execution-agent token file is empty.');return value;};
  const value=config.token;if(!value)throw new Error('Execution-agent credential is not configured.');return async()=>value;
}
