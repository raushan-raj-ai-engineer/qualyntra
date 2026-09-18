/**
 * File: packages/security/src/file-secret.ts
 * Purpose: Reads deployment-mounted secret files with bounded size and whitespace normalization without persisting secret values.
 * Author: Raushan Raj
 */
import { promises as fs } from 'node:fs';

export async function readSecretFile(path:string,maxBytes=65_536):Promise<string>{
  if(!path?.trim())throw new Error('Secret file path is required.');
  const data=await fs.readFile(path);
  if(data.byteLength===0)throw new Error('Secret file is empty.');
  if(data.byteLength>maxBytes)throw new Error(`Secret file exceeds ${maxBytes} bytes.`);
  const value=data.toString('utf8').trim();
  if(!value)throw new Error('Secret file contains no usable value.');
  return value;
}
