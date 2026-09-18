/**
 * File: tests/security/file-secret-auth.test.ts
 * Purpose: Verifies file-mounted secret reading and rotating bearer authentication for orchestrated deployments.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';import { promises as fs } from 'node:fs';import os from 'node:os';import path from 'node:path';
import { readSecretFile } from '../../packages/security/src/file-secret';
import { FileBearerAuthenticator } from '../../packages/control-plane/src/auth';
import { FileBootstrapServiceSessionResolver } from '../../apps/dashboard/src/session';
const actor={id:'svc',type:'service' as const,assignments:[{roleId:'platform-admin',scope:{organizationId:'org'}}]};

test('secret file reader trims mounted secret values and rejects empty files',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'qualyntra-secret-'));const file=path.join(dir,'token');await fs.writeFile(file,'  alpha\n');assert.equal(await readSecretFile(file),'alpha');await fs.writeFile(file,' \n');await assert.rejects(()=>readSecretFile(file),/no usable value/);await fs.rm(dir,{recursive:true,force:true});});
test('file bearer authenticator observes token rotation without process restart',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'qualyntra-auth-'));const file=path.join(dir,'token');await fs.writeFile(file,'one');const auth=new FileBearerAuthenticator(file,actor);assert.equal((await auth.authenticate({authorization:'Bearer one'}))?.actor.id,'svc');await fs.writeFile(file,'two');assert.equal(await auth.authenticate({authorization:'Bearer one'}),undefined);assert.equal((await auth.authenticate({authorization:'Bearer two'}))?.authenticationMethod,'bearer-file');await fs.rm(dir,{recursive:true,force:true});});
test('dashboard file bootstrap resolver reads rotated token server-side',async()=>{const dir=await fs.mkdtemp(path.join(os.tmpdir(),'qualyntra-dashboard-secret-'));const file=path.join(dir,'token');await fs.writeFile(file,'first');const resolver=new FileBootstrapServiceSessionResolver(file,'ui');assert.equal((await resolver.resolve({}))?.authorization,'Bearer first');await fs.writeFile(file,'second');assert.equal((await resolver.resolve({}))?.authorization,'Bearer second');await fs.rm(dir,{recursive:true,force:true});});
