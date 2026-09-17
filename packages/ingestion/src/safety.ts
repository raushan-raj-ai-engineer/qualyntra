/**
 * File: packages/ingestion/src/safety.ts
 * Purpose: Enforces file-size, path-confinement, and XML-safety rules before external result artifacts are parsed.
 * Author: Raushan Raj
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

export const DEFAULT_INGESTION_LIMITS={maxBytes:10*1024*1024,maxResults:100_000,failOnEmpty:true} as const;

export function assertSafeXml(content:string):void {
  if(/<!DOCTYPE\b/i.test(content)||/<!ENTITY\b/i.test(content)) throw new Error('XML document type/entity declarations are not allowed for result ingestion.');
}

export function assertTextContent(content:string,maxBytes:number):void {
  const bytes=Buffer.byteLength(content,'utf8');
  if(bytes>maxBytes) throw new Error(`Result artifact exceeds configured size limit (${bytes} > ${maxBytes} bytes).`);
  if(content.includes('\0')) throw new Error('Result artifact contains NUL bytes and is not accepted as text.');
}

function isWithin(root:string,target:string):boolean {
  const relative=path.relative(root,target);
  return relative===''||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative));
}

export async function readConfinedTextFile(filePath:string,allowedRoot:string|undefined,maxBytes:number):Promise<{content:string;sourceName:string}> {
  const resolvedFile=await fs.realpath(path.resolve(filePath));
  if(allowedRoot){
    const resolvedRoot=await fs.realpath(path.resolve(allowedRoot));
    if(!isWithin(resolvedRoot,resolvedFile)) throw new Error('Result artifact path escapes the configured ingestion root.');
  }
  const stat=await fs.stat(resolvedFile);
  if(!stat.isFile()) throw new Error('Result artifact path must reference a regular file.');
  if(stat.size>maxBytes) throw new Error(`Result artifact exceeds configured size limit (${stat.size} > ${maxBytes} bytes).`);
  const content=await fs.readFile(resolvedFile,'utf8');
  assertTextContent(content,maxBytes);
  return {content,sourceName:path.basename(resolvedFile)};
}
