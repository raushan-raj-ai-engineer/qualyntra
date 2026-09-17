/**
 * File: tests/execution/process-runner.test.ts
 * Purpose: Tests runner-neutral external process execution without requiring a test framework installation.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';import { ProcessRunnerAdapter } from '../../packages/execution/src/process-runner';
test('generic process runner captures exit status and output',async()=>{const a=new ProcessRunnerAdapter({id:'runner.test',defaultCommand:process.execPath,baseArgs:['-e'],capabilities:{discovery:false,cancellation:false,sharding:false,retries:false,tags:false,junitOutput:false}});const r=await a.execute({runId:'r',projectId:'p',runtime:{language:'typescript',runner:'node'},args:['console.log("ok")']});assert.equal(r.status,'passed');assert.match(r.stdout??'',/ok/);});

