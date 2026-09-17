/**
 * File: adapters/results/robot-xml/src/index.ts
 * Purpose: Normalizes common Robot Framework output.xml test/status structures into Qualyntra universal results.
 * Author: Raushan Raj
 */
import type { ResultAdapter,UniversalTestResult,TestStatus } from '../../../../packages/contracts/src/result';
import type { RuntimeIdentity } from '../../../../packages/contracts/src/execution';
import { createId } from '../../../../packages/core/src/ids';
import { stripXml,xmlAttrs } from '../../shared/src';

function status(value:string|undefined):TestStatus{const normalized=(value??'').toUpperCase();if(normalized==='PASS')return'passed';if(normalized==='SKIP'||normalized==='NOT RUN')return'skipped';if(normalized==='FAIL')return'failed';return'error';}
function elapsedMs(attrs:Record<string,string>):number{if(attrs.elapsed){const n=Number(attrs.elapsed);return Number.isFinite(n)?Math.max(0,Math.round(n*1000)):0;}if(attrs.elapsedtime){const n=Number(attrs.elapsedtime);return Number.isFinite(n)?Math.max(0,Math.round(n)):0;}return 0;}
export class RobotXmlResultAdapter implements ResultAdapter{
  readonly id='result.robot-xml';
  supports(path:string,contentType?:string):boolean{return /(?:^|\/)output\.xml$/i.test(path)||contentType==='application/vnd.robotframework+xml';}
  async parse(input:{path?:string;content?:string;runId:string;runtime:RuntimeIdentity}):Promise<UniversalTestResult[]>{if(!input.content)throw new Error('Robot parser requires XML content.');const results:UniversalTestResult[]=[];const re=/<test\b([^>]*)>([\s\S]*?)<\/test>/gi;let match:RegExpExecArray|null;while((match=re.exec(input.content))){const attrs=xmlAttrs(match[1]??'');const body=match[2]??'';const statusMatch=/<status\b([^>]*)>([\s\S]*?)<\/status>/gi;let current:RegExpExecArray|null;let finalStatus:RegExpExecArray|null=null;while((current=statusMatch.exec(body)))finalStatus=current;if(!finalStatus)continue;const statusAttrs=xmlAttrs(finalStatus[1]??'');const testStatus=status(statusAttrs.status);const message=stripXml(finalStatus[2]??'');results.push({id:attrs.id??createId('test'),runId:input.runId,name:attrs.name??'unnamed',status:testStatus,durationMs:elapsedMs(statusAttrs),runtime:input.runtime,startedAt:statusAttrs.start??statusAttrs.starttime,failure:testStatus==='failed'||testStatus==='error'?{category:'assertion',message:message||`Robot status: ${statusAttrs.status??'unknown'}`}:undefined,metadata:{robotId:attrs.id,sourceLine:attrs.line}});}return results;}
}
