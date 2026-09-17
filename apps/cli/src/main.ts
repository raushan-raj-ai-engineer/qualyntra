/**
 * File: apps/cli/src/main.ts
 * Purpose: Provides a minimal stable CLI for version, doctor, and capability inspection workflows.
 * Author: Raushan Raj
 */
import { loadConfiguration } from '../../../packages/configuration/src/env';
const command=process.argv[2]??'help'; if(command==='version'){console.log('1.0.0');}else if(command==='doctor'){const c=loadConfiguration();console.log(JSON.stringify({ok:true,node:process.version,configuration:{host:c.host,port:c.port,networkEnabled:c.security.network.allowNetwork},checks:['configuration','runtime']},null,2));}else if(command==='capabilities'){console.log(JSON.stringify({automation:['playwright','selenium','appium','cypress','webdriverio'],runners:['playwright-test','pytest','junit','testng','custom-process'],languages:['typescript','python','java','dotnet'],ai:['multi-provider','custom-provider','llm-judge','deepeval-bridge','rag','agent/tool metrics']},null,2));}else{console.log('Qualyntra CLI\nCommands: version | doctor | capabilities');}

