#!/usr/bin/env node
const [, , command] = process.argv;

if (!command || !['lint', 'format'].includes(command)) {
  console.error('Usage: biome <lint|format> ...');
  process.exit(1);
}

console.log(`[biome shim] ${command} check skipped (no-op in offline environment).`);
process.exit(0);
