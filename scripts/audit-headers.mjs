/**
 * File: scripts/audit-headers.mjs
 * Purpose: Ensures human-authored implementation and documentation files declare purpose and author metadata while excluding generated artifacts.
 * Author: Raushan Raj
 */

import fs from 'node:fs';
import path from 'node:path';

const roots = [
  'apps',
  'packages',
  'adapters',
  'sdks',
  'schemas',
  'compatibility',
  'docs',
  'scripts',
  'tests',
  'types',
];

const ignoredDirectories = new Set([
  'node_modules',
  'dist',
  'coverage',
  'bin',
  'obj',
  'target',
  '__pycache__',
  '.git',
  '.qualyntra',
  'artifacts',
  'reports',
]);

const checkExt = /\.(ts|mjs|py|java|cs|md|yml|yaml|json|toml|csproj|sql)$/;
const failures = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) {
        continue;
      }

      walk(filePath);
      continue;
    }

    if (!checkExt.test(entry.name)) {
      continue;
    }

    const text = fs.readFileSync(filePath, 'utf8').slice(0, 1200);

    const hasAuthor =
      /Author:\s*Raushan Raj/i.test(text) ||
      /x-author"\s*:\s*"Raushan Raj"/i.test(text) ||
      /authors\s*=\s*\[\{name\s*=\s*"Raushan Raj"\}\]/i.test(text);

    const hasPurpose =
      /Purpose:/i.test(text) ||
      /x-file-purpose"\s*:/i.test(text);

    if (!hasAuthor) {
      failures.push(`${filePath}: missing author`);
    }

    if (!hasPurpose) {
      failures.push(`${filePath}: missing purpose`);
    }
  }
}

for (const root of roots) {
  if (fs.existsSync(root)) {
    walk(root);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Header audit passed.');
