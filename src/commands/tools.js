// tools.js — lệnh CLI cho 17 tool mở rộng (gọi REST /public/v1 qua api.call). In kết quả JSON gọn.
// [260722] Mọi param ảnh/media đi qua resolveMediaInput(s): URL giữ nguyên, file local
// tự upload presigned (server chặn inline base64 >64KB) — user truyền path file thoải mái.
const { call } = require('../api');
const { resolveMediaInput, resolveMediaInputs } = require('../media');

const rmi = (v) => (v == null ? v : resolveMediaInput(v)); // giữ undefined/null nguyên vẹn

const out = (data) => console.log(JSON.stringify(data, null, 2));
const jobHint = (data) => {
  out(data);
  const id = data.job_id || (Array.isArray(data.job_ids) && data.job_ids[0]);
  if (id) console.log(`\n→ Theo dõi: quickmagic jobs get ${id}`);
};
// [code-review-p03.md L8] api.js#call gán e.code = json.code (REST giữ nguyên code cho mục đích này) —
// bản cũ chỉ in message, script/agent đọc stderr KHÔNG phân biệt được 'feature_disabled' với lỗi khác.
const run = (fn) => (...a) => fn(...a).catch((e) => { console.error('Lỗi:', e.code ? `[${e.code}] ${e.message}` : e.message); process.exit(1); });

// ── Nhập liệu (không tốn credit) ──
const scrape = run(async (url) => out(await call('POST', '/scrape', { body: { url } })));
const importSocial = run(async (url, o) => out(await call('POST', '/import', { body: { url, media: o.media || 'image', max: o.max ? Number(o.max) : undefined } })));
const assets = run(async (kind, o) => out(await call('GET', `/assets?kind=${encodeURIComponent(kind)}${o.limit ? `&limit=${Number(o.limit)}` : ''}`)));
const analyze = run(async (video_url, o) => out(await call('POST', '/analyze', { body: { video_url, product_id: o.productId ? Number(o.productId) : undefined } })));

// ── Marketing ──
const marketingModes = run(async () => out(await call('GET', '/marketing/modes')));
const marketingVideo = run(async (o) => jobHint(await call('POST', '/marketing/videos', { body: { mode_id: Number(o.mode), product_id: o.productId ? Number(o.productId) : undefined, avatar_id: o.avatarId ? Number(o.avatarId) : undefined, avatar_kind: o.avatarKind, duration: o.duration ? Number(o.duration) : undefined, aspect_ratio: o.aspectRatio, client_request_id: o.crid } })));

// ── Product / Fashion ──
const product = run(async (o) => jobHint(await call('POST', '/product/images', { body: { refs: await Promise.all((o.refs || []).map(async (r) => (/^\d+$/.test(r) ? Number(r) : await rmi(r)))), image_types: o.types || ['product'], count_per_type: o.count ? Number(o.count) : undefined, kol_id: o.kolId ? Number(o.kolId) : undefined, instruction: o.instruction, model: o.model, client_request_id: o.crid } })));
const fashion = run(async (o) => jobHint(await call('POST', '/fashion/images', { body: { mode: o.mode, outfit_ids: (o.outfit || []).map(Number), kol_kind: o.kolKind, kol_id: o.kolId ? Number(o.kolId) : undefined, model: o.model, client_request_id: o.crid } })));

// ── Ảnh ──
const edit = run(async (image, o) => jobHint(await call('POST', '/edit', { body: { image: await rmi(image), tool: o.tool, model: o.model, style: o.style, client_request_id: o.crid } })));
// [260825, plans/260825-1344-upscale-studio-hf-clone P04] 1 lệnh CLI = N file = N job (mỗi file 1
// job/hold riêng, REST /upscale(-video) chỉ nhận 1 file/call). --crid dùng CHUNG y nguyên cho cả vòng
// lặp sẽ khiến BE coi file 2+ TRÙNG file 1 (idempotency theo client_request_id) → chỉ file đầu có job
// thật, các file sau lặng lẽ trả về CÙNG job đó (thiếu file, không lỗi rõ ràng) — hậu tố `-${i}` cho
// mỗi file 1 khoá riêng, vẫn giữ được idempotency khi retry NGUYÊN LỆNH (cùng --crid, cùng thứ tự file).
//
// [260826, plans/260826-1200-upscale-video-hf-clone-byteplus-vcube P03] mở rộng ẢNH → VIDEO cùng lệnh:
// --video ép mọi file coi là video; không truyền thì tự nhận theo đuôi .mp4/.mov/.webm (KHÔNG .m4v —
// media.js/get_upload_url không có mime cho đuôi này). data:video/ hoặc data:image/ (file ≤64KB đã
// inline) tự nhận theo mime, KHÔNG cần đuôi.
const VIDEO_EXT_RE = /\.(mp4|mov|webm)(\?.*)?$/i;
function looksLikeVideo(ref) {
  if (/^data:video\//i.test(ref)) return true;
  if (/^data:image\//i.test(ref)) return false;
  if (/^https?:\/\//i.test(ref)) {
    try { return VIDEO_EXT_RE.test(new URL(ref).pathname); } catch { return false; }
  }
  return VIDEO_EXT_RE.test(ref);
}
const upscale = run(async (files, o) => {
  for (const [i, f] of files.entries()) {              // LẶP — không phải files[0]
    const crid = o.crid ? `${o.crid}-${i}` : undefined;
    const is_video = !!o.video || looksLikeVideo(f);
    // [code-review-p03.md H3] --resolution KHÔNG còn default ở commander (index.js). Ảnh: giữ default
    // '4k' CŨ (P04, chỉ áp khi user không truyền). Video: KHÔNG tự thêm default — để trống thì server
    // (createMediaJobs) tự chọn default_resolution 1080p, tránh CLI âm thầm gửi bậc giá đắt nhất.
    const res = is_video
      ? await call('POST', '/upscale-video', { body: { video: await rmi(f), model: o.model, resolution: o.resolution, client_request_id: crid } })
      : await call('POST', '/upscale', { body: { image: await rmi(f), model: o.model, resolution: o.resolution || '4k', client_request_id: crid } });
    jobHint(res);                                       // in job_id từng file
  }
});
const tryon = run(async (o) => jobHint(await call('POST', '/tryon', { body: { type: o.type, model: o.model, model_image: await rmi(o.model_image), garment_image: await rmi(o.garment), upper_image: await rmi(o.upper), lower_image: await rmi(o.lower), background_image: await rmi(o.background), prompt: o.prompt, client_request_id: o.crid } })));

// ── Video nặng / audio ──
const stt = run(async (audio_url, o) => jobHint(await call('POST', '/stt', { body: { audio_url, language_translate: o.translate, client_request_id: o.crid } })));
const subtitle = run(async (video_url, o) => jobHint(await call('POST', '/subtitle', { body: { video_url, enable_voice_dubbing: !!o.dub, target_lang: o.translate, client_request_id: o.crid } })));
const split = run(async (video_url, o) => jobHint(await call('POST', '/split', { body: { video_url, clip_mode: o.mode, title_lang: o.titleLang, translate_lang: o.translate, client_request_id: o.crid } })));
const motion = run(async (video_url, o) => jobHint(await call('POST', '/motion', { body: { video_url, image_urls: await resolveMediaInputs(o.image || []), model: o.model, mode: o.mode, prompt: o.prompt, client_request_id: o.crid } })));

// ── Cutout / Hook Studio ──
const cutout = run(async (o) => jobHint(await call('POST', '/cutout', { body: { operation: o.operation, ref_image_urls: await resolveMediaInputs(o.ref || []), prompt: o.prompt, model: o.model, aspect_ratio: o.aspectRatio, quality: o.quality, num_images: o.n ? Number(o.n) : undefined, transparent_bg: o.transparentBg, client_request_id: o.crid } })));
const hookPresets = run(async () => out(await call('GET', '/hook/presets')));
const hookVideo = run(async (o) => jobHint(await call('POST', '/hook/videos', { body: { preset_id: o.preset, character_url: await rmi(o.character), product_url: await rmi(o.product), aspect: o.aspect, speech_lang: o.speechLang, custom_cta: o.cta, location_url: o.location, accessory_url: o.accessory, style: o.style, format: o.format, resolution: o.resolution, client_request_id: o.crid } })));

module.exports = { scrape, importSocial, assets, analyze, marketingModes, marketingVideo, product, fashion, edit, upscale, tryon, stt, subtitle, split, motion, cutout, hookPresets, hookVideo };
