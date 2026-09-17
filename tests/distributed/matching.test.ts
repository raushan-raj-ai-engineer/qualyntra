/**
 * File: tests/distributed/matching.test.ts
 * Purpose: Verifies deterministic capability-based worker selection across language, runner, engine, OS, and labels.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';import { workerMatches } from '../../packages/distributed/src/matching';
const capabilities={languages:['python','typescript'],runners:['pytest','playwright-test'],engines:['playwright'],labels:['gpu','chrome'],operatingSystems:['linux']};
test('worker matching requires every requested capability and label',()=>{assert.equal(workerMatches(capabilities,{language:'python',runner:'pytest',labels:['gpu']}),true);assert.equal(workerMatches(capabilities,{language:'java'}),false);assert.equal(workerMatches(capabilities,{engine:'selenium'}),false);assert.equal(workerMatches(capabilities,{labels:['gpu','arm64']}),false);assert.equal(workerMatches(capabilities,{operatingSystem:'windows'}),false);});
