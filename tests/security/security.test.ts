/**
 * File: tests/security/security.test.ts
 * Purpose: Tests network-deny-by-default and recursive secret redaction policies.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';import { assertNetworkAllowed } from '../../packages/security/src/network-policy';import { redact } from '../../packages/security/src/redaction';
test('network defaults can deny egress',()=>assert.throws(()=>assertNetworkAllowed('https://example.com',{allowNetwork:false,allowedHosts:[]})));test('redaction removes nested secrets',()=>{const x=redact({token:'abc',nested:{password:'def',safe:'ok'}},['token','password']) as any;assert.equal(x.token,'[REDACTED]');assert.equal(x.nested.password,'[REDACTED]');assert.equal(x.nested.safe,'ok');});

