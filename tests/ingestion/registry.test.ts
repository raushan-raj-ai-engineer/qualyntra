/**
 * File: tests/ingestion/registry.test.ts
 * Purpose: Verifies format auto-detection priority and explicit adapter resolution for external result ingestion.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { createDefaultResultIngestionRegistry } from '../../adapters/results/default-registry/src';

const registry=createDefaultResultIngestionRegistry();
test('registry detects TRX before generic XML adapters',()=>{const r=registry.resolve({path:'results.trx',content:'<TestRun><Results><UnitTestResult testName="x" outcome="Passed" /></Results></TestRun>'});assert.equal(r.format,'trx');});
test('registry detects Robot native output XML',()=>{const r=registry.resolve({path:'output.xml',content:'<robot generator="Robot"><suite /></robot>'});assert.equal(r.format,'robot-xml');});
test('registry detects Allure result JSON',()=>{const r=registry.resolve({path:'abc-result.json',content:'{"uuid":"u","status":"passed","name":"x"}'});assert.equal(r.format,'allure-json');});
test('registry detects Cucumber JSON',()=>{const r=registry.resolve({path:'cucumber.json',content:'[{"name":"Feature","elements":[]}]'});assert.equal(r.format,'cucumber-json');});
test('explicit format bypasses auto-detection',()=>{const r=registry.resolve({format:'junit-xml',path:'whatever.data',content:'<testsuite />'});assert.equal(r.format,'junit-xml');});
