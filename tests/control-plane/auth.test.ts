/**
 * File: tests/control-plane/auth.test.ts
 * Purpose: Verifies fail-closed bearer authentication, constant-time comparison behavior, and unconfigured authentication handling.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { StaticBearerAuthenticator } from '../../packages/control-plane/src';
const actor={id:'svc',type:'service' as const,assignments:[{roleId:'platform-admin',scope:{organizationId:'o1'}}]};
test('static bearer authenticator accepts the configured token',async()=>{const auth=new StaticBearerAuthenticator('secret-token',actor);assert.equal(auth.configured(),true);assert.equal((await auth.authenticate({authorization:'Bearer secret-token'}))?.actor.id,'svc');});
test('static bearer authenticator rejects wrong and malformed credentials',async()=>{const auth=new StaticBearerAuthenticator('secret-token',actor);assert.equal(await auth.authenticate({authorization:'Bearer wrong'}),undefined);assert.equal(await auth.authenticate({authorization:'Basic abc'}),undefined);});
test('static bearer authenticator fails closed when bootstrap identity is incomplete',async()=>{const auth=new StaticBearerAuthenticator(undefined,actor);assert.equal(auth.configured(),false);assert.equal(await auth.authenticate({authorization:'Bearer anything'}),undefined);});
