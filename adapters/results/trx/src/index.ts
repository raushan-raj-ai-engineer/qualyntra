/**
 * File: adapters/results/trx/src/index.ts
 * Purpose: Normalizes Microsoft Visual Studio Test Results (TRX) artifacts into Qualyntra universal results.
 * Author: Raushan Raj
 */
import type { ResultAdapter,UniversalTestResult,TestStatus } from '../../../../packages/contracts/src/result';
import type { RuntimeIdentity } from '../../../../packages/contracts/src/execution';
import { createId } from '../../../../packages/core/src/ids';
import { decodeXml,parseIsoDurationMs,stripXml,xmlAttrs } from '../../shared/src';

function status(outcome:string):TestStatus{const value=outcome.toLowerCase();if(value==='passed')return'passed';if(value==='notexecuted'||value==='skipped')return'skipped';if(value==='failed')return'failed';return'error';}
export class TrxResultAdapter implements ResultAdapter{
  readonly id='result.trx';
  supports(path:string,contentType?:string):boolean{return /\.trx$/i.test(path)||contentType==='application/vnd.ms-test.trx';}
  async parse(input:{path?:string;content?:string;runId:string;runtime:RuntimeIdentity}):Promise<UniversalTestResult[]>{
    if(!input.content)throw new Error('TRX parser requires XML content.');
    const results:UniversalTestResult[]=[];const re=/<UnitTestResult\b([^>]*?)(?:\/>|>([\s\S]*?)<\/UnitTestResult>)/gi;let match:RegExpExecArray|null;
    while((match=re.exec(input.content))){const attrs=xmlAttrs(match[1]??'');const body=match[2]??'';const error=/<ErrorInfo\b[^>]*>([\s\S]*?)<\/ErrorInfo>/i.exec(body)?.[1]??'';const message=/<Message\b[^>]*>([\s\S]*?)<\/Message>/i.exec(error)?.[1];const stack=/<StackTrace\b[^>]*>([\s\S]*?)<\/StackTrace>/i.exec(error)?.[1];const testStatus=status(attrs.outcome??'');results.push({id:createId('test'),runId:input.runId,suite:decodeXml(attrs.testType??attrs.computerName??''),name:attrs.testName??'unnamed',status:testStatus,durationMs:parseIsoDurationMs(attrs.duration),runtime:input.runtime,startedAt:attrs.startTime,finishedAt:attrs.endTime,failure:testStatus==='failed'||testStatus==='error'?{category:testStatus==='failed'?'assertion':'runner',message:message?stripXml(message):`TRX outcome: ${attrs.outcome??'unknown'}`,stack:stack?stripXml(stack):undefined}:undefined,metadata:{executionId:attrs.executionId,testId:attrs.testId,outcome:attrs.outcome}});}
    return results;
  }
}
