/**
 * File: scripts/copy-dashboard-assets.mjs
 * Purpose: Copies reviewed static dashboard assets into the build output after browser TypeScript compilation.
 * Author: Raushan Raj
 */
import fs from 'node:fs';import path from 'node:path';
const source=path.resolve('apps/dashboard/public');const target=path.resolve('dist/apps/dashboard/public');fs.mkdirSync(target,{recursive:true});for(const name of ['index.html','styles.css'])fs.copyFileSync(path.join(source,name),path.join(target,name));console.log('Dashboard static assets copied.');
