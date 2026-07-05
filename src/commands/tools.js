// tools.js — lệnh CLI cho 14 tool mở rộng (gọi REST /public/v1 qua api.call). In kết quả JSON gọn.
const { call } = require('../api');

const out = (data) => console.log(JSON.stringify(data, null, 2));
const jobHint = (data) => {
  out(data);
  const id = data.job_id || (Array.isArray(data.job_ids) && data.job_ids[0]);
  if (id) console.log(`\n→ Theo dõi: quickmagic jobs get ${id}`);
};
const run = (fn) => (...a) => fn(...a).catch((e) => { console.error('Lỗi:', e.message); process.exit(1); });

// ── Nhập liệu (không tốn credit) ──
const scrape = run(async (url) => out(await call('POST', '/scrape', { body: { url } })));
const importSocial = run(async (url, o) => out(await call('POST', '/import', { body: { url, media: o.media || 'image', max: o.max ? Number(o.max) : undefined } })));
const assets = run(async (kind, o) => out(await call('GET', `/assets?kind=${encodeURIComponent(kind)}${o.limit ? `&limit=${Number(o.limit)}` : ''}`)));
const analyze = run(async (video_url, o) => out(await call('POST', '/analyze', { body: { video_url, product_id: o.productId ? Number(o.productId) : undefined } })));

// ── Marketing ──
const marketingModes = run(async () => out(await call('GET', '/marketing/modes')));
const marketingVideo = run(async (o) => jobHint(await call('POST', '/marketing/videos', { body: { mode_id: Number(o.mode), product_id: o.productId ? Number(o.productId) : undefined, avatar_id: o.avatarId ? Number(o.avatarId) : undefined, avatar_kind: o.avatarKind, duration: o.duration ? Number(o.duration) : undefined, aspect_ratio: o.aspectRatio, client_request_id: o.crid } })));

// ── Product / Fashion ──
const product = run(async (o) => jobHint(await call('POST', '/product/images', { body: { refs: (o.refs || []).map((r) => (/^\d+$/.test(r) ? Number(r) : r)), image_types: o.types || ['product'], count_per_type: o.count ? Number(o.count) : undefined, kol_id: o.kolId ? Number(o.kolId) : undefined, instruction: o.instruction, model: o.model, client_request_id: o.crid } })));
const fashion = run(async (o) => jobHint(await call('POST', '/fashion/images', { body: { mode: o.mode, outfit_ids: (o.outfit || []).map(Number), kol_kind: o.kolKind, kol_id: o.kolId ? Number(o.kolId) : undefined, model: o.model, client_request_id: o.crid } })));

// ── Ảnh ──
const edit = run(async (image, o) => jobHint(await call('POST', '/edit', { body: { image, tool: o.tool, model: o.model, upscale_target: o.upscaleTarget, style: o.style, client_request_id: o.crid } })));
const tryon = run(async (o) => jobHint(await call('POST', '/tryon', { body: { type: o.type, model: o.model, model_image: o.model_image, garment_image: o.garment, upper_image: o.upper, lower_image: o.lower, background_image: o.background, prompt: o.prompt, client_request_id: o.crid } })));

// ── Video nặng / audio ──
const stt = run(async (audio_url, o) => jobHint(await call('POST', '/stt', { body: { audio_url, language_translate: o.translate, client_request_id: o.crid } })));
const subtitle = run(async (video_url, o) => jobHint(await call('POST', '/subtitle', { body: { video_url, enable_voice_dubbing: !!o.dub, target_lang: o.translate, client_request_id: o.crid } })));
const split = run(async (video_url, o) => jobHint(await call('POST', '/split', { body: { video_url, clip_mode: o.mode, title_lang: o.titleLang, translate_lang: o.translate, client_request_id: o.crid } })));
const motion = run(async (video_url, o) => jobHint(await call('POST', '/motion', { body: { video_url, image_urls: o.image || [], model: o.model, mode: o.mode, prompt: o.prompt, client_request_id: o.crid } })));

module.exports = { scrape, importSocial, assets, analyze, marketingModes, marketingVideo, product, fashion, edit, tryon, stt, subtitle, split, motion };
