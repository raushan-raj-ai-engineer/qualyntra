/**
 * File: scripts/compatibility-check.mjs
 * Purpose: Checks that the compatibility registry has a platform version and explicit policies for supported tool families.
 * Author: Raushan Raj
 */
import fs from 'node:fs';const registry=JSON.parse(fs.readFileSync('compatibility/registry.json','utf8'));if(registry.platformVersion!=='1.0.0')throw new Error('Compatibility registry platformVersion must match release.');for(const tool of ['playwright','selenium','appium','pytest','junit'])if(!registry.tools?.[tool]?.policy)throw new Error(`Missing compatibility policy for ${tool}`);console.log('Compatibility registry check passed.');

