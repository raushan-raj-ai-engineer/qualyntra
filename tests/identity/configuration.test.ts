/**
 * File: tests/identity/configuration.test.ts
 * Purpose: Verifies enterprise OIDC environment configuration is explicit, bounded, and role mappings require unambiguous group-to-role syntax.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';import { loadConfiguration } from '../../packages/configuration/src/env';

test('OIDC configuration is disabled by default and does not weaken the bootstrap API path',()=>{const config=loadConfiguration({});assert.equal(config.identity.oidc.enabled,false);assert.equal(config.identity.oidc.allowedAlgorithms.includes('RS256'),true);});
test('OIDC issuer requires audience and parses explicit group role mappings',()=>{assert.throws(()=>loadConfiguration({QUALYNTRA_OIDC_ISSUER:'https://issuer.example'}),/AUDIENCES/);const config=loadConfiguration({QUALYNTRA_OIDC_ISSUER:'https://issuer.example',QUALYNTRA_OIDC_AUDIENCES:'api',QUALYNTRA_OIDC_ROLE_MAPPINGS:'qa-admin=platform-admin,qa-view=quality-viewer'});assert.deepEqual(config.identity.oidc.roleMappings,[{group:'qa-admin',roleId:'platform-admin'},{group:'qa-view',roleId:'quality-viewer'}]);});
