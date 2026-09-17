/**
 * File: scripts/audit-architecture.mjs
 * Purpose: Fails validation if vendor-specific imports leak into protected platform-kernel directories.
 * Author: Raushan Raj
 */
import fs from 'node:fs';import path from 'node:path';
const roots=['packages/contracts','packages/core','packages/configuration','packages/security','packages/evaluation','packages/reporting','packages/runtime','packages/providers','packages/ingestion','packages/governance','packages/integrations','packages/control-plane','packages/persistence'];const banned=['@playwright','selenium','appium','cypress','webdriverio','pytest','junit','testng','deepeval','openai','anthropic','@google/generative-ai'];const failures=[];function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())walk(f);else if(/\.(ts|js|mjs)$/.test(e.name)){const t=fs.readFileSync(f,'utf8').toLowerCase();for(const token of banned)if(t.includes(`from '${token}`)||t.includes(`from "${token}`)||t.includes(`require('${token}`)||t.includes(`require("${token}`))failures.push(`${f}: ${token}`);}}}for(const r of roots)walk(r);if(failures.length){console.error(failures.join('\n'));process.exit(1);}console.log('Architecture audit passed: protected kernel has no vendor imports.');

