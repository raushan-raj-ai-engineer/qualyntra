/**
 * File: tests/dashboard/dashboard-session.test.ts
 * Purpose: Verifies opaque cookie session resolution, expiry handling, disabled sessions, and local bootstrap token confinement.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { BootstrapServiceSessionResolver,CookieDashboardSessionResolver,DisabledDashboardSessionResolver,type DashboardSessionStore } from '../../apps/dashboard/src/session';

class Store implements DashboardSessionStore{constructor(private readonly records:Record<string,any>){}async get(id:string){return this.records[id];}}

test('disabled dashboard resolver never authenticates',async()=>assert.equal(await new DisabledDashboardSessionResolver().resolve({headers:{}}),undefined));
test('bootstrap resolver keeps token server-side in authorization result',async()=>assert.deepEqual(await new BootstrapServiceSessionResolver('abc','svc').resolve({}),{authorization:'Bearer abc',actorId:'svc'}));
test('cookie resolver maps opaque cookie to server-side authorization',async()=>{const future=new Date(Date.now()+60_000).toISOString();const resolver=new CookieDashboardSessionResolver(new Store({opaque:{id:'opaque',authorization:'Bearer upstream',actorId:'user-1',expiresAt:future}}));assert.deepEqual(await resolver.resolve({headers:{cookie:'theme=dark; __Host-qualyntra-session=opaque'}}),{authorization:'Bearer upstream',actorId:'user-1',expiresAt:future});});
test('cookie resolver rejects expired and unknown sessions',async()=>{const past=new Date(Date.now()-60_000).toISOString();const resolver=new CookieDashboardSessionResolver(new Store({old:{id:'old',authorization:'Bearer upstream',expiresAt:past}}));assert.equal(await resolver.resolve({headers:{cookie:'__Host-qualyntra-session=old'}}),undefined);assert.equal(await resolver.resolve({headers:{cookie:'__Host-qualyntra-session=missing'}}),undefined);});
