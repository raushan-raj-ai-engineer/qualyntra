/**
 * File: tests/control-plane/artifact-backend.test.ts
 * Purpose: Verifies artifact-object backend selection is local by default and S3 mode fails closed before credential or SDK use when required configuration is incomplete.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';
import { createControlPlaneArtifactStorage } from '../../apps/control-plane/src/artifact-backend';

test('control plane artifact backend defaults to local storage',async()=>{const result=await createControlPlaneArtifactStorage({dataDir:'.qualyntra-test',networkPolicy:{allowNetwork:false,allowedHosts:[]},env:{}});assert.equal(result.mode,'local');assert.equal(result.adapter.descriptor.id,'artifact.local');});
test('S3 artifact backend fails closed when required endpoint configuration is incomplete',async()=>{await assert.rejects(()=>createControlPlaneArtifactStorage({dataDir:'.qualyntra-test',networkPolicy:{allowNetwork:true,allowedHosts:['s3']},env:{QUALYNTRA_ARTIFACT_STORAGE_BACKEND:'s3'}}),/QUALYNTRA_S3_ENDPOINT/);});
test('unknown artifact backend modes are rejected',async()=>{await assert.rejects(()=>createControlPlaneArtifactStorage({dataDir:'.qualyntra-test',networkPolicy:{allowNetwork:false,allowedHosts:[]},env:{QUALYNTRA_ARTIFACT_STORAGE_BACKEND:'shared-disk'}}),/local or s3/);});
