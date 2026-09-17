/**
 * File: adapters/automation/python-bridge/src/index.ts
 * Purpose: Executes Python Playwright/Selenium automation plans through the Qualyntra JSON-over-stdio bridge without importing Python vendor libraries into Node.
 * Author: Raushan Raj
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import type { Adapter,AdapterDescriptor,AdapterHealth } from '../../../../packages/contracts/src/adapter';
import type {
  AutomationCapabilities,
  AutomationExecutionOutcome,
  AutomationPlan,
  ExecutableAutomationAdapter,
} from '../../../../packages/contracts/src/automation';

export interface PythonBridgeOptions {
  pythonCommand?:string;
  sdkRoot?:string;
  cwd?:string;
  env?:Record<string,string|undefined>;
  timeoutMs?:number;
}

export interface PythonBridgeResponse {
  ok:boolean;
  data?:unknown;
  error?:{type?:string;message?:string};
}

export type PythonBridgeInvoker=(payload:Record<string,unknown>,options:PythonBridgeOptions)=>Promise<PythonBridgeResponse>;

export const descriptor:AdapterDescriptor={
  id:'automation.python-bridge',
  kind:'automation',
  version:'1.0.0',
  displayName:'Python Automation Bridge',
  description:'JSON-over-stdio automation bridge for project-owned Playwright Python and Selenium Python runtimes.',
  supportedLanguages:['python'],
  supportedTools:['playwright','selenium'],
  capabilities:['web','screenshots','tracing','remote-webdriver','evidence','normalized-results'],
};

export async function invokePythonBridge(
  payload:Record<string,unknown>,
  options:PythonBridgeOptions={},
):Promise<PythonBridgeResponse>{
  const pythonCommand=options.pythonCommand??process.env.QUALYNTRA_PYTHON_EXECUTABLE??'python3';
  const timeoutMs=options.timeoutMs??120_000;
  const sdkRoot=options.sdkRoot;
  const env={...process.env,...options.env};
  if(sdkRoot){
    const existing=env.PYTHONPATH;
    env.PYTHONPATH=existing?`${sdkRoot}${path.delimiter}${existing}`:sdkRoot;
  }
  return await new Promise((resolve,reject)=>{
    let stdout='';let stderr='';let settled=false;
    const child=spawn(pythonCommand,['-m','qualyntra.bridge'],{
      cwd:options.cwd??process.cwd(),env,shell:false,stdio:['pipe','pipe','pipe'],
    });
    const timer=setTimeout(()=>{
      if(settled)return;
      settled=true;child.kill('SIGTERM');
      reject(new Error(`Python automation bridge timed out after ${timeoutMs} ms.`));
    },timeoutMs);
    child.stdout?.on('data',(chunk:unknown)=>stdout+=String(chunk));
    child.stderr?.on('data',(chunk:unknown)=>stderr+=String(chunk));
    child.on('error',(error:Error)=>{
      if(settled)return;settled=true;clearTimeout(timer);reject(error);
    });
    child.on('close',(code:number|null)=>{
      if(settled)return;settled=true;clearTimeout(timer);
      let response:PythonBridgeResponse;
      try{response=JSON.parse(stdout.trim()) as PythonBridgeResponse;}
      catch{reject(new Error(`Python automation bridge returned invalid JSON${stderr?`: ${stderr.trim()}`:''}.`));return;}
      if(code!==0&&!response.error){
        reject(new Error(`Python automation bridge exited with ${code??'unknown'}${stderr?`: ${stderr.trim()}`:''}.`));return;
      }
      resolve(response);
    });
    child.stdin?.end(JSON.stringify(payload));
  });
}

export class PythonAutomationBridgeAdapter implements ExecutableAutomationAdapter,Adapter {
  readonly id=descriptor.id;
  readonly descriptor=descriptor;
  constructor(
    private readonly options:PythonBridgeOptions={},
    private readonly invoker:PythonBridgeInvoker=invokePythonBridge,
  ){}
  capabilities():AutomationCapabilities{
    return {web:true,mobile:false,api:false,tracing:true,screenshots:true,networkInterception:false,visualComparison:false,accessibility:false,storageState:false};
  }
  describe():Record<string,unknown>{return {...descriptor};}
  async health():Promise<AdapterHealth>{
    try{
      const response=await this.invoker({operation:'automation.health'},this.options);
      if(!response.ok){return {status:'unavailable',checkedAt:new Date().toISOString(),message:response.error?.message??'Python automation bridge unavailable.'};}
      const data=(response.data??{}) as {engines?:Record<string,{available?:boolean}>};
      const available=Object.values(data.engines??{}).some((engine)=>engine.available===true);
      return {status:available?'healthy':'degraded',checkedAt:new Date().toISOString(),message:available?'At least one Python automation engine is available.':'Python bridge is reachable, but Playwright/Selenium are not installed.'};
    }catch(error){
      return {status:'unavailable',checkedAt:new Date().toISOString(),message:error instanceof Error?error.message:String(error)};
    }
  }
  async execute(plan:AutomationPlan):Promise<AutomationExecutionOutcome>{
    if(!plan.runId||!plan.engine||!Array.isArray(plan.commands))throw new Error('Automation plan requires runId, engine, and commands.');
    const response=await this.invoker({operation:'automation.execute',plan},this.options);
    if(!response.ok)throw new Error(response.error?.message??'Python automation execution failed.');
    const data=(response.data??{}) as {result?:AutomationExecutionOutcome};
    if(!data.result)throw new Error('Python automation bridge response did not include a result.');
    return data.result;
  }
}
