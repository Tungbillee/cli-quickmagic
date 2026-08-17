// commands/voice.js — qm tts + qm voices list/clone/delete (4 endpoint REST P2: GET /voices,
// POST /tts, POST /voice-clones, DELETE /voice-clones/:voice_id). Tách khỏi tools.js vì 4 lệnh
// này cần đọc file text, đếm ký tự, in bảng, gộp --wait — nhét vào phá quy ước 1-dòng/lệnh.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { call } = require('../api');
const { resolveMediaInput } = require('../media');
const jobs = require('./jobs');

const out = (data) => console.log(JSON.stringify(data, null, 2));
// [red-team #15] api.js đã gắn err.code từ REST {code,message} → in kèm code để agent rẽ nhánh
// (retryable 5xx/429 vs không 4xx như SKILL dặn); lỗi cục bộ (vd thiếu --text) không có code.
const run = (fn) => (...a) => fn(...a).catch((e) => {
  console.error(e.code ? `Lỗi [${e.code}]: ${e.message}` : `Lỗi: ${e.message}`);
  process.exit(1);
});

// Query string cho GET /voices — bỏ param rỗng/undefined (chỉ model bắt buộc).
function buildQuery(params) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

// Bảng text căn cột đơn giản — repo không có thư viện bảng, KHÔNG thêm dependency mới.
function printTable(headers, rows) {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i] == null ? '' : r[i]).length)));
  const line = (cells) => cells.map((c, i) => String(c == null ? '' : c).padEnd(widths[i])).join('  ');
  console.log(line(headers));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) console.log(line(r));
}

function printPricing(p) {
  if (p.billing === 'flat') console.log(`Giá: ${p.credits} credit/lần`);
  else console.log(`Giá: ${p.credits_per_char} credit/ký tự, tối thiểu ${p.min_charge}`);
  console.log(`Trần ký tự: ${p.char_limit}`);
}

// ── tts ──
const tts = run(async (o) => {
  if (!o.text && !o.file) throw new Error('Cần --text hoặc --file');
  const text = o.text || fs.readFileSync(path.resolve(o.file), 'utf8');
  console.log(`Số ký tự: ${text.length}`);
  const data = await call('POST', '/tts', {
    body: {
      model: o.model, voice: o.voice, language: o.language, text,
      speed: o.speed ? Number(o.speed) : undefined, style: o.style, title: o.title,
      client_request_id: o.crid,
    },
  });
  out(data);
  console.log(`\n→ Theo dõi: qm jobs get ${data.job_id}`);
  if (o.wait) {
    // waitAll KHÔNG trả data (chỉ poll + tự tải khi có result_url đơn) — gọi lại /jobs để in result_url.
    await jobs.waitAll([data.job_id], o.out);
    const final = await call('GET', `/jobs/${data.job_id}`);
    console.log(`result_url: ${final.result_url || '(chưa có)'}`);
  }
});

// ── voices list ──
const voicesList = run(async (o) => {
  const data = await call('GET', `/voices${buildQuery({ model: o.model, language: o.language, search: o.search, limit: o.limit })}`);
  const pricing = data.pricing || {}; // [review C4] BE lỗi/shape cũ → không crash, in được phần còn lại
  printPricing(pricing);
  if (pricing.billing === 'per_char') {
    if (data.clone_price != null) console.log(`Giá clone giọng riêng: ${data.clone_price} credit`);
    // [review C2] false có 2 nghĩa: (a) đã dùng suất, (b) chưa có gói trả phí active (BE trả first_free_upsell=true).
    if (data.first_free_available != null) {
      const free_msg = data.first_free_available ? 'còn (giọng #1 = 0 credit)'
        : data.first_free_upsell ? 'chỉ dành cho tài khoản có gói trả phí đang hoạt động (https://quickmagic.vn/pricing)'
          : 'đã dùng';
      console.log(`Suất clone miễn phí lần đầu: ${free_msg}`);
    }
    if (data.hint) console.log(data.hint);
  }
  console.log('');
  if (pricing.billing === 'flat') {
    printTable(
      ['VOICE', 'NAME', 'GENDER', 'LANGUAGE', 'STYLES'],
      data.voices.map((v) => [v.voice, v.name, v.gender, v.language, (v.styles || []).join(', ').slice(0, 40)]),
    );
  } else {
    const clones = data.voices.filter((v) => v.kind === 'clone');
    const systems = data.voices.filter((v) => v.kind === 'system');
    if (clones.length) {
      console.log('Giọng của bạn:');
      printTable(['VOICE', 'STATUS', 'SAMPLE'], clones.map((v) => [v.voice, v.status, v.sample_url]));
      console.log('');
    }
    if (systems.length) {
      console.log('Giọng hệ thống:');
      printTable(['VOICE', 'NAME', 'NAME_EN', 'GENDER', 'LANGUAGE'], systems.map((v) => [v.voice, v.name, v.name_en, v.gender, v.language]));
    }
  }
  console.log(`\nNgôn ngữ: ${(data.languages || []).join(' · ')}`);
  console.log(`Tổng: ${data.total} — Hiển thị: ${data.returned}`);
});

// [red-team #14] auto-crid = hash(bytes file cục bộ | chuỗi URL) + hash(name) — retry vô tình
// (mất mạng, gõ lại lệnh) không tạo 2 voice/2 hold 2.230cr khi user không tự truyền --crid.
function autoCrid(audio_ref, name) {
  const is_url = /^https?:\/\//i.test(audio_ref);
  let source = audio_ref;
  if (!is_url) {
    const abs_path = path.resolve(audio_ref);
    if (!fs.existsSync(abs_path)) throw new Error(`Không thấy file: ${audio_ref}`);
    source = fs.readFileSync(abs_path);
  }
  const h1 = crypto.createHash('sha256').update(source).digest('hex').slice(0, 32);
  const h2 = crypto.createHash('sha256').update(name).digest('hex').slice(0, 8);
  return `cli-${h1}-${h2}`;
}

// ── voices clone ──
const voicesClone = run(async (o) => {
  const crid = o.crid || autoCrid(o.audio, o.name);
  const audio_url = await resolveMediaInput(o.audio);
  const data = await call('POST', '/voice-clones', { body: { audio_url, name: o.name, client_request_id: crid } });
  out(data);
  console.log(`\nclient_request_id: ${crid}`);
  console.log(`→ Dùng --voice "${o.name}" ở qm tts (model qimi_5/qimi_5.5) sau khi status completed`);
  if (o.wait) {
    // Job clone (voc_) không có result_url ⇒ --wait chỉ poll trạng thái; in voice/sample_url sau khi xong.
    await jobs.waitAll([data.voice_id]);
    const final = await call('GET', `/jobs/${data.voice_id}`);
    console.log(`voice: ${final.voice || ''}`);
    console.log(`sample_url: ${final.sample_url || '(chưa có)'}`);
    console.log(`status: ${final.status}`);
  }
});

// ── voices delete ──
const voicesDelete = run(async (id) => {
  out(await call('DELETE', `/voice-clones/${encodeURIComponent(String(id).replace(/^voc_/, ''))}`));
});

module.exports = { tts, voicesList, voicesClone, voicesDelete };
