/**
 * File: scripts/release-validate.mjs
 * Purpose: Runs the complete local polyglot release-quality gate and fails immediately when any validation step fails.
 * Author: Raushan Raj
 */

import { spawnSync } from 'node:child_process';

const steps = [
  ['npm', ['run', 'typecheck']],
  ['npm', ['run', 'test']],

  ['npm', ['run', 'audit:architecture']],
  ['npm', ['run', 'audit:headers']],
  ['npm', ['run', 'audit:hardcoding']],
  ['npm', ['run', 'audit:schemas']],
  ['npm', ['run', 'compatibility:check']],

  [
    'python3',
    [
      '-m',
      'unittest',
      'discover',
      '-s',
      'sdks/python/tests',
      '-v',
    ],
  ],

  ['bash', ['scripts/validate-java-sdk.sh']],
  ['bash', ['scripts/validate-dotnet-sdk.sh']],
];

for (const [command, args] of steps) {
  console.log(`\n==> ${command} ${args.join(' ')}`);

  const result = spawnSync(command, args, {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log('\nQualyntra release validation passed.');
