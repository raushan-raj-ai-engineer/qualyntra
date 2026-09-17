/**
 * File: tests/control-plane/rate-limit.test.ts
 * Purpose: Verifies bounded fixed-window API rate limiting and expiry cleanup using a deterministic clock.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { FixedWindowRateLimiter } from '../../packages/control-plane/src';
test('rate limiter allows configured requests and then returns retry guidance',()=>{let now=0;const limiter=new FixedWindowRateLimiter(2,1000,()=>now);assert.equal(limiter.consume('a').allowed,true);assert.equal(limiter.consume('a').remaining,0);const denied=limiter.consume('a');assert.equal(denied.allowed,false);assert.equal(denied.retryAfterSeconds,1);now=1001;assert.equal(limiter.consume('a').allowed,true);});
test('rate limiter isolates callers by key',()=>{const limiter=new FixedWindowRateLimiter(1);assert.equal(limiter.consume('a').allowed,true);assert.equal(limiter.consume('a').allowed,false);assert.equal(limiter.consume('b').allowed,true);});
