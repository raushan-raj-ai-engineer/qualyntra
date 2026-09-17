/**
 * File: packages/ingestion/src/service.ts
 * Purpose: Safely loads, detects, normalizes, annotates, limits, and optionally deduplicates external test-result artifacts.
 * Author: Raushan Raj
 */
import path from 'node:path';
import type { UniversalTestResult } from '../../contracts/src/result';
import type { ResultIngestionOutcome,ResultIngestionRequest,ResultIngestionLimits } from './types';
import { ResultIngestionRegistry } from './registry';
import { DEFAULT_INGESTION_LIMITS,assertSafeXml,assertTextContent,readConfinedTextFile } from './safety';
import { resultFingerprint } from './fingerprint';

function mergeLimits(input?:Partial<ResultIngestionLimits>):ResultIngestionLimits{return {...DEFAULT_INGESTION_LIMITS,...input};}
function looksXml(content:string,contentType?:string,pathName?:string):boolean{return /^\s*</.test(content)||/xml/i.test(contentType??'')||/\.xml$|\.trx$/i.test(pathName??'');}

export class ResultIngestionService {
  constructor(private readonly registry:ResultIngestionRegistry){}

  async ingest(request:ResultIngestionRequest):Promise<ResultIngestionOutcome>{
    if(!request.runId.trim()) throw new Error('runId is required for result ingestion.');
    const limits=mergeLimits(request.limits);
    if(limits.maxBytes<=0||limits.maxResults<=0) throw new Error('Ingestion limits must be positive.');
    let content=request.content;
    let sourceName=request.path?path.basename(request.path):undefined;
    if(content===undefined){
      if(!request.path) throw new Error('Result ingestion requires either content or path.');
      const loaded=await readConfinedTextFile(request.path,request.allowedRoot,limits.maxBytes);
      content=loaded.content;sourceName=loaded.sourceName;
    } else assertTextContent(content,limits.maxBytes);
    if(looksXml(content,request.contentType,request.path)) assertSafeXml(content);

    const registration=this.registry.resolve({format:request.format,path:request.path,contentType:request.contentType,content});
    let results=await registration.adapter.parse({path:request.path,content,runId:request.runId,runtime:request.runtime});
    if(results.length>limits.maxResults) throw new Error(`Parsed result count exceeds configured limit (${results.length} > ${limits.maxResults}).`);
    if(results.length===0&&limits.failOnEmpty) throw new Error(`Result adapter '${registration.format}' produced no test results.`);

    let duplicateCount=0;
    const seen=new Set<string>();
    const normalized:UniversalTestResult[]=[];
    for(const result of results){
      const fingerprint=resultFingerprint(result);
      if(request.deduplicate&&seen.has(fingerprint)){duplicateCount++;continue;}
      seen.add(fingerprint);
      normalized.push({...result,runId:request.runId,runtime:request.runtime,metadata:{...(result.metadata??{}),ingestion:{format:registration.format,sourceName,fingerprint}}});
    }
    results=normalized;
    const count=(status:UniversalTestResult['status'])=>results.filter(result=>result.status===status).length;
    return {results,summary:{format:registration.format,sourceName,total:results.length,passed:count('passed'),failed:count('failed'),skipped:count('skipped'),error:count('error'),duplicateCount}};
  }
}
