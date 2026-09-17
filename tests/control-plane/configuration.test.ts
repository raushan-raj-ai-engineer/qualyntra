/**
 * File: tests/control-plane/configuration.test.ts
 * Purpose: Verifies safe control-plane configuration defaults and rejects invalid deployment limits before server startup.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { loadConfiguration } from '../../packages/configuration/src/env';
test('configuration loads bounded control-plane defaults',()=>{const config=loadConfiguration({});assert.equal(config.controlPlane.maxBodyBytes,1_048_576);assert.equal(config.controlPlane.maxPageSize,100);assert.equal(config.controlPlane.rateLimitPerMinute,120);assert.deepEqual(config.controlPlane.corsOrigins,[]);});
test('configuration rejects invalid API limits',()=>{assert.throws(()=>loadConfiguration({QUALYNTRA_API_MAX_PAGE_SIZE:'0'}),/QUALYNTRA_API_MAX_PAGE_SIZE/);assert.throws(()=>loadConfiguration({QUALYNTRA_API_MAX_BODY_BYTES:'999999999'}),/QUALYNTRA_API_MAX_BODY_BYTES/);});
