/**
 * File: apps/cli/src/main.ts
 * Purpose: Provides stable developer/operator commands for version, diagnostics, capabilities, and safe external-result ingestion.
 * Author: Raushan Raj
 */
import { loadConfiguration } from '../../../packages/configuration/src/env';
import { createId } from '../../../packages/core/src/ids';
import { ResultIngestionService } from '../../../packages/ingestion/src';
import { createDefaultResultIngestionRegistry } from '../../../adapters/results/default-registry/src';

async function main():Promise<void>{
  const command=process.argv[2]??'help';
  if(command==='version'){console.log('1.0.0');return;}
  if(command==='doctor'){const c=loadConfiguration();console.log(JSON.stringify({ok:true,node:process.version,configuration:{host:c.host,port:c.port,networkEnabled:c.security.network.allowNetwork},checks:['configuration','runtime']},null,2));return;}
  if(command==='capabilities'){console.log(JSON.stringify({automation:['playwright','selenium','appium','cypress','webdriverio'],runners:['playwright-test','pytest','junit','testng','custom-process'],languages:['typescript','python','java','dotnet'],results:['junit-xml','trx','allure-json','cucumber-json','robot-xml'],ai:['multi-provider','custom-provider','llm-judge','deepeval-bridge','rag','agent/tool metrics']},null,2));return;}
  if(command==='ingest-results'){
    const filePath=process.argv[3];const format=process.argv[4];
    if(!filePath)throw new Error('Usage: qualyntra ingest-results <path> [format]');
    const service=new ResultIngestionService(createDefaultResultIngestionRegistry());
    const outcome=await service.ingest({runId:process.env.QUALYNTRA_RUN_ID??createId('run'),runtime:{language:process.env.QUALYNTRA_RESULT_LANGUAGE??'external',runner:process.env.QUALYNTRA_RESULT_RUNNER??'external'},path:filePath,format,allowedRoot:process.cwd()});
    console.log(JSON.stringify(outcome,null,2));return;
  }
  console.log('Qualyntra CLI\nCommands: version | doctor | capabilities | ingest-results <path> [format]');
}

main().catch((error)=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});
