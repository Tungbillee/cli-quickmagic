// media.js — resolve input media cho mọi lệnh nhận ảnh/video/audio [260722].
// URL/data URI → giữ nguyên. File local: ≤64KB → data:base64 (server chấp nhận inline nhỏ);
// >64KB → POST /public/v1/uploads lấy presigned URL → PUT bytes thẳng lên storage → dùng file_url.
// WHY: server chặn inline base64 >64KB (chống agent chép base64 khổng lồ qua hội thoại) —
// CLI có mạng thật nên upload trực tiếp luôn nhanh hơn và giữ NGUYÊN chất lượng file gốc.
const fs = require('fs');
const path = require('path');
const api = require('./api');

const MAX_INLINE_BYTES = 64 * 1024;
const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
};

async function putBytes(upload_url, buf, content_type) {
  const res = await fetch(upload_url, {
    method: 'PUT',
    headers: { 'Content-Type': content_type },
    body: buf,
  });
  if (!res.ok) throw new Error(`Upload thất bại (HTTP ${res.status}). Thử lại hoặc dùng URL.`);
}

// 1 input → URL dùng được ngay cho tool (async — có thể upload).
async function resolveMediaInput(ref) {
  if (/^https?:\/\//i.test(ref) || /^data:/i.test(ref)) return ref;
  const abs_path = path.resolve(ref);
  if (!fs.existsSync(abs_path)) throw new Error(`Không thấy file: ${ref}`);
  const ext = path.extname(abs_path).toLowerCase();
  const content_type = MIME_BY_EXT[ext];
  if (!content_type) throw new Error(`Định dạng không hỗ trợ: ${ext} (${ref}) — hỗ trợ: ${Object.keys(MIME_BY_EXT).join(' ')}`);
  const buf = fs.readFileSync(abs_path);

  if (buf.length <= MAX_INLINE_BYTES && content_type.startsWith('image/')) {
    return `data:${content_type};base64,${buf.toString('base64')}`;
  }

  const data = await api.call('POST', '/uploads', {
    body: { content_type, filename: path.basename(abs_path).slice(0, 120) },
  });
  if (!data.upload_url || !data.file_url) throw new Error('Server không cấp được link upload. Thử lại.');
  await putBytes(data.upload_url, buf, content_type);
  console.log(`Đã upload ${path.basename(abs_path)} (${Math.round(buf.length / 1024)}KB) → ${data.file_url}`);
  return data.file_url;
}

async function resolveMediaInputs(refs) {
  if (!refs || !refs.length) return [];
  const out = [];
  for (const r of refs) out.push(await resolveMediaInput(r));
  return out;
}

module.exports = { resolveMediaInput, resolveMediaInputs };
