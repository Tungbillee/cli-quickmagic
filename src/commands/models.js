// commands/models.js — liệt kê model ảnh/video/nhạc dạng bảng key | label | credit (+IMAGES cho
// video). `qm models list --type music` dùng chung hàm này; bảng ĐẦY ĐỦ hơn (giá/ETA/hàng chờ) nằm
// ở `qm music models` (commands/music.js) — dành cho ai đã quen `qm models list` chung 1 lệnh.
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
    console.log('\n* KHÔNG nhận ảnh người upload/từ ngoài (gửi vào sẽ lỗi, không mất credit).');
    console.log('  Muốn có nhân vật với model *: tạo ảnh bằng "qm generate image -m seedream-5.0-pro" ngay trong Quick Magic');
    console.log('  rồi dùng ảnh đó (provider chấp nhận ảnh thuần Seedream 5.0 Pro — đã probe thật 260808).');
    console.log('  Hoặc dùng model không dấu *: gemini-omni / wan-3-0 / wan-2-7 / seedance 1.x nhận ảnh người trực tiếp.');
  }
  // [Portrait 260819] server bật pass-through → model từng cấm người thật giờ trả real_person_note (không còn dấu *)
  if (is_video && models.some((m) => m.real_person_note)) {
    console.log('\nℹ Ảnh người thật: Seedance 2.x nhận bình thường — hệ thống chuẩn bị ảnh thêm ~1-3 phút ở lần đầu dùng 1 ảnh');
    console.log('  (qm jobs wait tự chờ). Nếu bộ lọc nội dung của model từ chối (bản quyền/chính sách), job failed kèm lý do rõ, credit hoàn.');
  }
}

module.exports = { list };
