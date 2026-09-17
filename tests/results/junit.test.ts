/**
 * File: tests/results/junit.test.ts
 * Purpose: Tests JUnit XML normalization for passed, failed, and skipped cases from external runners.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';import { JUnitXmlResultAdapter } from '../../adapters/results/junit-xml/src/index';
test('junit xml normalizes common statuses',async()=>{const xml=`<testsuite><testcase classname="a" name="ok" time="0.1"/><testcase classname="a" name="bad" time="0.2"><failure>boom</failure></testcase><testcase classname="a" name="skip"><skipped/></testcase></testsuite>`;const r=await new JUnitXmlResultAdapter().parse({content:xml,runId:'r',runtime:{language:'python',runner:'pytest'}});assert.equal(r.length,3);assert.deepEqual(r.map(x=>x.status),['passed','failed','skipped']);assert.equal(r[1]?.failure?.message,'boom');});

