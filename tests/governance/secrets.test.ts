/**
 * File: tests/governance/secrets.test.ts
 * Purpose: Verifies secret values remain behind resolvers and environment references are validated.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { EnvironmentSecretResolver,SecretResolverRegistry } from '../../packages/security/src';
test('secret registry resolves by reference without putting values in contracts',async()=>{process.env.QUALYNTRA_TEST_SECRET='value';const registry=new SecretResolverRegistry();registry.register(new EnvironmentSecretResolver());assert.equal(await registry.resolve({provider:'environment',key:'QUALYNTRA_TEST_SECRET'}),'value');delete process.env.QUALYNTRA_TEST_SECRET;});
test('environment secret resolver rejects unsafe key names and missing values',async()=>{const resolver=new EnvironmentSecretResolver();await assert.rejects(()=>resolver.resolve({provider:'environment',key:'../../secret'}),/uppercase/);await assert.rejects(()=>resolver.resolve({provider:'environment',key:'QUALYNTRA_MISSING_SECRET'}),/unavailable/);});
