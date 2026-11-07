// commands/credits.js — in số dư credit qua GET /public/v1/credits.
const api = require('../api');
const { formatCredits } = require('../credit-format');

async function show() {
  const data = await api.call('GET', '/credits');
  console.log(`Số dư (balance): ${formatCredits(data.balance)}`);
  console.log(`Tạm giữ (held):  ${formatCredits(data.held)}`);
  console.log(`Gói (plan):      ${data.plan ?? '—'}`);
  // Benefit Qimi: cửa sổ 10 ngày miễn phí ảnh qimi_3/qimi_2.5 (gói Business/Enterprise).
  if (data.qimi_benefit?.active) {
    const days = data.qimi_benefit.window_ends_at
      ? Math.max(0, Math.ceil((data.qimi_benefit.window_ends_at - Date.now()) / 86400000))
      : 0;
    const mode = data.qimi_benefit.speed_mode ? 'Nhanh — trả credit, chạy song song' : 'Miễn phí — 1 ảnh/lần';
    console.log(`Qimi miễn phí:   còn ${days} ngày (chế độ: ${mode})`);
  }
}

module.exports = { show };
