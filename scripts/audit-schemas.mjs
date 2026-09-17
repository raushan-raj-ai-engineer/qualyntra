/**
 * File: scripts/audit-schemas.mjs
 * Purpose: Validates that all JSON schemas and compatibility metadata are syntactically valid JSON.
 * Author: Raushan Raj
 */
import fs from 'node:fs';import path from 'node:path';const roots=['schemas','compatibility'];let count=0;function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())walk(f);else if(e.name.endsWith('.json')){JSON.parse(fs.readFileSync(f,'utf8'));count++;}}}for(const r of roots)walk(r);console.log(`Schema/metadata JSON audit passed (${count} files).`);

