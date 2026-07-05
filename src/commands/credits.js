// commands/credits.js — in số dư credit qua GET /public/v1/credits.
const api = require('../api');

async function show() {
  const data = await api.call('GET', '/credits');
  console.log(`Số dư (balance): ${data.balance ?? 0}`);
  console.log(`Tạm giữ (held):  ${data.held ?? 0}`);
  console.log(`Gói (plan):      ${data.plan ?? '—'}`);
}

module.exports = { show };
