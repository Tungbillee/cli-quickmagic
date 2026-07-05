// commands/models.js — liệt kê model ảnh/video dạng bảng key | label | credit.
const api = require('../api');

async function list(options) {
  const type = (options && options.type) || 'image';
  const data = await api.call('GET', `/models?type=${encodeURIComponent(type)}`);
  const models = data.models || [];
  if (!models.length) {
    console.log('Không có model nào.');
    return;
  }

  const rows = models.map((m) => ({
    key: String(m.key || ''),
    label: String(m.label || ''),
    credit: String(m.credit ?? m.credit_cost ?? m.credit_per_image ?? ''),
  }));
  const key_w = Math.max(3, ...rows.map((r) => r.key.length));
  const label_w = Math.max(5, ...rows.map((r) => r.label.length));

  const header = `${'KEY'.padEnd(key_w)}  ${'LABEL'.padEnd(label_w)}  CREDIT`;
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const r of rows) {
    console.log(`${r.key.padEnd(key_w)}  ${r.label.padEnd(label_w)}  ${r.credit}`);
  }
}

module.exports = { list };
