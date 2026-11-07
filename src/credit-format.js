// credit-format.js — print credit amounts after the credit unit rescale (1 credit ~ 1.000d at the cheapest plan).
// Balances carry up to 3 decimals, job prices are multiples of 0.1. Output is read by people AND by agent skills,
// so it uses a plain "." decimal point and no thousands separator ("5401.44", not "5.401,44").
// Truncated to 2 decimals, never rounded up: a 0.095 balance must not read "0.1" next to a 0.1 job it cannot afford.
'use strict';

function formatCredits(value) {
  if (value == null || value === '') return '0';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value); // placeholder or unexpected text: show it as is
  if (n === 0) return '0';
  const abs = Math.abs(n);
  if (abs < 0.01) return `${n < 0 ? '-' : ''}<0.01`; // a positive amount is never shown as 0
  return String(Math.sign(n) * (Math.floor(abs * 100 + 1e-6) / 100));
}

// Per-unit rate (e.g. credits per character, ~0.00162 after the rescale): up to 5 decimals so a small rate is never shown as 0.
// This is a rate, not a price: the job total is what gets charged (ceiled to 0.1 credit, min 0.1).
function formatRate(value) {
  if (value == null || value === '') return '?';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return String(Number(n.toFixed(5)));
}

module.exports = { formatCredits, formatRate };
