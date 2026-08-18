// commands/music.js — qm music create/lyrics/models/get (Xưởng Nhạc Melo: REST /music, /music/lyrics,
// /models?type=music, /jobs/mus_<n>). Tách khỏi tools.js vì cần đọc file lời + gộp --wait + in bảng.
const fs = require('fs');
const path = require('path');
const { call } = require('../api');
const jobs = require('./jobs');

const out = (data) => console.log(JSON.stringify(data, null, 2));
// [mirror voice.js] api.js đã gắn err.code từ REST {code,message} → in kèm code để rẽ nhánh (retryable
// 5xx/429 vs không 4xx).
const run = (fn) => (...a) => fn(...a).catch((e) => {
  console.error(e.code ? `Lỗi [${e.code}]: ${e.message}` : `Lỗi: ${e.message}`);
  process.exit(1);
});

// Bảng text căn cột đơn giản — repo không có thư viện bảng, KHÔNG thêm dependency mới (mirror voice.js).
function printTable(headers, rows) {
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i] == null ? '' : r[i]).length)));
  const line = (cells) => cells.map((c, i) => String(c == null ? '' : c).padEnd(widths[i])).join('  ');
  console.log(line(headers));
  console.log(widths.map((w) => '-'.repeat(w)).join('  '));
  for (const r of rows) console.log(line(r));
}

function priceLabel(m) {
  return m.free_launch ? 'Miễn phí (giai đoạn ra mắt)' : `${m.credit} credit/bài`;
}

// ── music models ──
const models = run(async () => {
  const data = await call('GET', '/models?type=music');
  const rows = data.models || [];
  if (!rows.length) {
    console.log('Không có model nào.');
    return;
  }
  printTable(
    ['KEY', 'LABEL', 'GIÁ', 'ETA (s)', 'HÀNG CHỜ'],
    rows.map((m) => [m.key, m.label, priceLabel(m), m.eta_seconds, m.queue_capacity]),
  );
  if (rows.some((m) => m.free_launch)) {
    console.log('\nGiá đang MIỄN PHÍ giai đoạn ra mắt — có thể đổi bất kỳ lúc nào, luôn kiểm tra lại trước khi tạo bài.');
  }
});

// ── music lyrics — AI viết lời (0đ) ──
const lyrics = run(async (o) => {
  if (!o.desc) throw new Error('Cần --desc');
  const data = await call('POST', '/music/lyrics', {
    body: { description: o.desc, title: o.title, language: o.language, instrumental: !!o.instrumental },
  });
  console.log(`Tiêu đề: ${data.title}`);
  console.log(`Phong cách: ${data.style_tags}`);
  console.log('');
  console.log(data.lyrics || '(bản không lời — chỉ có tiêu đề + phong cách)');
});

// ── music create ──
const create = run(async (o) => {
  // [P06b-L5 fix 260818] Server (validateMinimal, music-submit-service.js) CHẤP instrumental chỉ cần
  // styles HOẶC description, không cần cả 2 — guard cục bộ cũ hẹp hơn hợp đồng, chặn oan
  // `--instrumental --styles "lofi"` không --desc. Nới điều kiện cho khớp.
  if (!o.desc && !o.lyrics && !o.lyricsFile && !(o.instrumental && o.styles)) {
    throw new Error('Cần --desc (mode simple/instrumental) hoặc --lyrics/--lyrics-file (mode custom) hoặc --instrumental kèm --styles');
  }
  // [P06b-L5 fix 260818] --out mà thiếu --wait trước đây bị LỜ ÂM THẦM (waitAll chỉ chạy khi o.wait) —
  // tự bật --wait để --out thực sự có tác dụng, kèm cảnh báo cho user biết.
  if (o.out && !o.wait) {
    console.log('Lưu ý: có --out nhưng thiếu --wait — tự động bật --wait để tải file khi bài xong.');
    o.wait = true;
  }

  // [KI #11] Đọc giá + free_launch NGAY TRƯỚC submit — gửi kèm expected_free chống lệch giá giữa lúc
  // quote và lúc submit thật (server fail-closed trả price_changed nếu lệch, KHÔNG âm thầm thu tiền).
  const catalog = await call('GET', '/models?type=music');
  const model_key = o.model || 'melo-3';
  const m = (catalog.models || []).find((x) => x.key === model_key);
  if (!m) {
    console.log(`Cảnh báo: không tìm thấy model "${model_key}" trong catalog hiện tại — vẫn thử gửi, server sẽ báo lỗi nếu sai.`);
  } else {
    console.log(priceLabel(m));
  }

  const lyrics_text = o.lyricsFile ? fs.readFileSync(path.resolve(o.lyricsFile), 'utf8') : o.lyrics;
  const data = await call('POST', '/music', {
    body: {
      mode: o.mode || 'simple', description: o.desc, lyrics: lyrics_text, title: o.title, model: model_key,
      styles: o.styles ? o.styles.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      instrumental: !!o.instrumental, vocal_gender: o.gender,
      expected_free: m ? m.free_launch : undefined, client_request_id: o.crid,
    },
  });
  out(data);
  console.log(`\n→ Theo dõi: qm music get ${data.job_id}`);
  if (o.wait) {
    // [KI #16] --out là THƯ MỤC (jobs.waitAll → fs.mkdirSync(out_dir) rồi ghi basename từ URL) —
    // truyền --out song.mp3 sẽ tạo THƯ MỤC tên song.mp3, không phải file. Dùng --out ./out.
    await jobs.waitAll([data.job_id], o.out);
    out(await call('GET', `/jobs/${data.job_id}`));
  }
});

// ── music get — chấp cả mus_<n> lẫn số trần ──
const get = run(async (id) => {
  const job_id = String(id).startsWith('mus_') ? id : `mus_${id}`;
  out(await call('GET', `/jobs/${job_id}`));
});

module.exports = { create, lyrics, models, get };
