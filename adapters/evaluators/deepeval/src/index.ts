/**
 * File: adapters/evaluators/deepeval/src/index.ts
 * Purpose: Provides an optional external-process bridge to DeepEval without introducing it as a platform-core dependency.
 * Author: Raushan Raj
 */
import { spawn } from 'node:child_process'; import type { EvaluationCase,MetricResult } from '../../../../packages/contracts/src/evaluation';
export interface DeepEvalBridgeOptions { python?:string; script?:string; timeoutMs?:number; }
export class DeepEvalBridge { constructor(private readonly options:DeepEvalBridgeOptions={}){} async evaluate(testCase:EvaluationCase,metrics:string[]):Promise<MetricResult[]>{const python=this.options.python??process.env.QUALYNTRA_DEEPEVAL_PYTHON??'python3';const script=this.options.script??'adapters/evaluators/deepeval/bridge/deepeval_bridge.py';const payload=JSON.stringify({testCase,metrics});return await new Promise((resolve,reject)=>{let out='',err='';const child=spawn(python,[script],{env:{...process.env,QUALYNTRA_DEEPEVAL_PAYLOAD:payload}});const timer=setTimeout(()=>{child.kill('SIGTERM');reject(new Error('DeepEval bridge timed out.'));},this.options.timeoutMs??60000);child.stdout?.on('data',(d:any)=>out+=String(d));child.stderr?.on('data',(d:any)=>err+=String(d));child.on('error',(e:any)=>{clearTimeout(timer);reject(e);});child.on('close',(code:any)=>{clearTimeout(timer);if(code!==0)return reject(new Error(`DeepEval bridge failed (${code}): ${err}`));try{resolve(JSON.parse(out));}catch{return reject(new Error('DeepEval bridge returned invalid JSON.'));}});});} }

