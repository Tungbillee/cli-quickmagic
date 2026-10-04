#!/usr/bin/env node
// Every `<module>.<handler>` that src/index.js wires to a command must exist as a function in that module.
// v1.9.0 shipped six commands (sfx, remove-bg, 3d create/animate, talking-photo, extend-video) bound to
// handlers that were never committed: `--help` listed them, running them threw "Cannot read properties of undefined".
'use strict';
const fs = require('fs');
const path = require('path');

const src_dir = path.join(__dirname, '..', 'src');
const index_src = fs.readFileSync(path.join(src_dir, 'index.js'), 'utf8');

const modules = {};
for (const m of index_src.matchAll(/^const (\w+) = require\('\.\/commands\/([\w-]+)'\);/gm)) modules[m[1]] = m[2];

const missing = [];
let checked = 0;
for (const [alias, file] of Object.entries(modules)) {
  const exported = require(path.join(src_dir, 'commands', file));
  const used = new Set([...index_src.matchAll(new RegExp(`\\b${alias}\\.(\\w+)`, 'g'))].map((m) => m[1]));
  for (const name of used) {
    checked += 1;
    if (typeof exported[name] !== 'function') missing.push(`${alias}.${name} (src/commands/${file}.js)`);
  }
}

if (!checked) {
  console.error('check-command-handlers: found no handlers in src/index.js — the pattern no longer matches, fix this script.');
  process.exit(1);
}
if (missing.length) {
  console.error(`check-command-handlers: ${missing.length} command handler(s) missing:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
console.log(`check-command-handlers: ${checked} handlers OK across ${Object.keys(modules).length} modules`);
