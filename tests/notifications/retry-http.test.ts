/**
 * File: tests/notifications/retry-http.test.ts
 * Purpose: Verifies notification retry policy is bounded and only retries explicitly idempotent transient failures.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { NotificationHttpError } from '../../packages/notifications/src/http';
import { withNotificationRetry } from '../../packages/notifications/src/retry';
test('idempotent transient notifications retry within configured attempt budget',async()=>{let calls=0;const value=await withNotificationRetry(async()=>{calls++;if(calls<3)throw new NotificationHttpError('temporary',503,true);return'ok';},true,{maxAttempts:3,baseDelayMs:1,maxDelayMs:2},async()=>{});assert.equal(value,'ok');assert.equal(calls,3);});
test('non-idempotent notification fails without retry',async()=>{let calls=0;await assert.rejects(()=>withNotificationRetry(async()=>{calls++;throw new NotificationHttpError('temporary',503,true);},false,{maxAttempts:3,baseDelayMs:1,maxDelayMs:2},async()=>{}));assert.equal(calls,1);});
