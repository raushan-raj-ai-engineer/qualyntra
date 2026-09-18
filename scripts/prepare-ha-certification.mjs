/**
 * File: scripts/prepare-ha-certification.mjs
 * Purpose: Generates local-only secret files required by the HA PostgreSQL and S3-compatible Docker certification topology without printing credential values.
 * Author: Raushan Raj
 */
import { randomBytes } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
const root=path.resolve('deploy/compose/.ha-secrets');await fs.mkdir(root,{recursive:true,mode:0o700});
const token=()=>randomBytes(32).toString('hex');
const values={
  'api-token':token(),
  'agent-token':token(),
  'postgres-password':token(),
  's3-access-key':`ha${randomBytes(10).toString('hex')}`,
  's3-secret-key':token(),
};
values['postgres-connection-string']=`postgresql://qualyntra:${encodeURIComponent(values['postgres-password'])}@postgres:5432/qualyntra`;
for(const [name,value] of Object.entries(values))await fs.writeFile(path.join(root,name),`${value}\n`,{mode:0o600});
console.log(`HA certification secrets prepared in ${root}. Values were not printed.`);
