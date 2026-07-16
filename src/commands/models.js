// commands/models.js — liệt kê model ảnh/video dạng bảng key | label | credit (+IMAGES cho video).
const api = require('../api');

// Cột IMAGES (video): "ref 9* · frames 2" — theo image_max_by_mode; * = mode cấm ảnh người thật.
function imagesCell(m) {
  const by_mode = m.image_max_by_mode || {};
  const banned = m.no_real_person_modes || [];
  const parts = Object.entries(by_mode).map(([mode, max]) => {
    const short = mode === 'reference' ? 'ref' : mode;
    return `${short} ${max}${banned.includes(mode) ? '*' : ''}`;
  });
  return parts.join(' · ') || String(m.image_max ?? '');
}

async function list(options) {
  const type = (options && options.type) || 'image';
  const data = await api.call('GET', `/models?type=${encodeURIComponent(type)}`);
  const models = data.models || [];
  if (!models.length) {
    console.log('Không có model nào.');
    return;
  }

  const is_video = type === 'video';
  const rows = models.map((m) => ({
    key: String(m.key || ''),
    label: String(m.label || ''),
    credit: String(m.credit ?? m.credit_cost ?? m.credit_per_image ?? ''),
    images: is_video ? imagesCell(m) : '',
  }));
  const key_w = Math.max(3, ...rows.map((r) => r.key.length));
  const label_w = Math.max(5, ...rows.map((r) => r.label.length));
  const credit_w = Math.max(6, ...rows.map((r) => r.credit.length));

  const header = `${'KEY'.padEnd(key_w)}  ${'LABEL'.padEnd(label_w)}  ${'CREDIT'.padEnd(credit_w)}${is_video ? '  IMAGES' : ''}`;
  console.log(header);
  console.log('-'.repeat(header.length + (is_video ? 14 : 0)));
  for (const r of rows) {
    console.log(`${r.key.padEnd(key_w)}  ${r.label.padEnd(label_w)}  ${r.credit.padEnd(credit_w)}${is_video ? `  ${r.images}` : ''}`);
  }
  if (is_video && rows.some((r) => r.images.includes('*'))) {
    console.log('\n* KHÔNG nhận ảnh chứa người thật (gửi vào sẽ lỗi) — dùng gemini-omni / seedance 1.x / wan-2-7 cho ảnh người.');
  }
}

module.exports = { list };
