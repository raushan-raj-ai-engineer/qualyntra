/**
 * File: packages/agent/src/secrets.ts
 * Purpose: Resolves job secret references only inside the agent process and materializes them into ephemeral runner environment variables.
 * Author: Raushan Raj
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { ExecutionRequest } from '../../contracts/src/execution';
import type { SecretReference,SecretResolver } from '../../contracts/src/governance';
function safeKey(value:string):string{if(!/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(value))throw new Error(`Secret environment key is invalid: ${value}`);return value;}
export class AgentEnvironmentSecretResolver implements SecretResolver{readonly id='agent-env';supports(reference:SecretReference){return reference.provider===this.id;}async resolve(reference:SecretReference){const value=process.env[reference.key];if(value===undefined)throw new Error(`Agent environment secret is unavailable: ${reference.key}`);return value;}}
export class AgentFileSecretResolver implements SecretResolver{readonly id='agent-file';constructor(private readonly root:string){}supports(reference:SecretReference){return reference.provider===this.id;}async resolve(reference:SecretReference){if(!/^[A-Za-z0-9._-]{1,128}$/.test(reference.key))throw new Error('Agent file-secret key is invalid.');const root=path.resolve(this.root);const file=path.resolve(root,reference.key);if(file!==root&&!file.startsWith(`${root}${path.sep}`))throw new Error('Agent file-secret path escapes configured root.');const value=(await fs.readFile(file,'utf8')).trimEnd();if(!value)throw new Error(`Agent file secret is empty: ${reference.key}`);return value;}}
export async function materializeExecutionSecrets(request:ExecutionRequest,resolvers:SecretResolver[]):Promise<ExecutionRequest>{if(request.env&&Object.keys(request.env).length)throw new Error('Leased distributed requests must not contain persisted raw environment values.');const refs=request.secretRefs??{};if(Object.keys(refs).length===0)return{...request};const env:Record<string,string>={};for(const [key,reference] of Object.entries(refs)){const resolver=resolvers.find(candidate=>candidate.supports(reference));if(!resolver)throw new Error(`No execution-agent secret resolver supports provider: ${reference.provider}`);env[safeKey(key)]=await resolver.resolve(reference);}return{...request,env};}
