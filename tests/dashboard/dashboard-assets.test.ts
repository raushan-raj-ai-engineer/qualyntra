/**
 * File: tests/dashboard/dashboard-assets.test.ts
 * Purpose: Guards the dashboard browser source against credential persistence, unsafe HTML injection, remote assets, and accidental missing production build output.
 * Author: Raushan Raj
 */
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';

const browser=[readFileSync('apps/dashboard/web/api.ts','utf8'),readFileSync('apps/dashboard/web/ui.ts','utf8'),readFileSync('apps/dashboard/web/app.ts','utf8')].join('\n');
const html=readFileSync('apps/dashboard/public/index.html','utf8');

test('dashboard browser source does not persist credentials in Web Storage',()=>{assert.doesNotMatch(browser,/localStorage|sessionStorage/);});
test('dashboard browser source does not use dynamic HTML injection',()=>{assert.doesNotMatch(browser,/innerHTML|outerHTML|insertAdjacentHTML/);});
test('dashboard shell contains no remote script, stylesheet, or image dependency',()=>{assert.doesNotMatch(html,/https?:\/\//);assert.match(html,/type="module"/);});
test('dashboard production build emits browser module and reviewed static assets',()=>{assert.equal(existsSync('dist/apps/dashboard/public/app.js'),true);assert.equal(existsSync('dist/apps/dashboard/public/index.html'),true);assert.equal(existsSync('dist/apps/dashboard/public/styles.css'),true);assert.equal(existsSync('dist/apps/dashboard/public/app.js.map'),false);});
