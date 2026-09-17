/**
 * File: scripts/audit-hardcoding.mjs
 * Purpose: Scans implementation code for embedded credentials and disallowed production endpoints while permitting documented examples.
 * Author: Raushan Raj
 */
import fs from 'node:fs';import path from 'node:path';const roots=['apps','packages','adapters'];const failures=[];const patterns=[[/sk-[A-Za-z0-9_-]{20,}/,'OpenAI-like secret'],[/AKIA[0-9A-Z]{16}/,'AWS access key'],[/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,'private key'],[/https?:\/\/(?!127\.0\.0\.1|localhost)[A-Za-z0-9.-]+/,'embedded external endpoint']];function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())walk(f);else if(/\.(ts|js|mjs)$/.test(e.name)){const t=fs.readFileSync(f,'utf8');for(const [re,label] of patterns)if(re.test(t))failures.push(`${f}: ${label}`);}}}for(const r of roots)walk(r);if(failures.length){console.error(failures.join('\n'));process.exit(1);}console.log('Hardcoding audit passed.');

