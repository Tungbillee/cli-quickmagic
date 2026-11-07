#!/usr/bin/env node
// Unit checks for src/credit-format.js (credit unit rescale: decimal credits, truncated display).
'use strict';
const assert = require('assert');
const { formatCredits, formatRate } = require('../src/credit-format');

const cases = [
  [5401.44, '5401.44'], [0.2, '0.2'], [11, '11'], [0, '0'], [null, '0'], [undefined, '0'], ['', '0'],
  [0.095, '0.09'], // a balance is cut off, never rounded up
  [0.1 + 0.2, '0.3'], // float noise keeps the cent
  [1234.5678, '1234.56'], ['2.16', '2.16'], [0.004, '<0.01'], [-0.2, '-0.2'], ['abc', 'abc'],
];
for (const [input, want] of cases) assert.strictEqual(formatCredits(input), want, `formatCredits(${JSON.stringify(input)})`);

assert.strictEqual(formatRate(0.00162), '0.00162');
assert.strictEqual(formatRate(2), '2');
assert.strictEqual(formatRate(null), '?');

console.log(`check-credit-format: ${cases.length + 3} cases OK`);
