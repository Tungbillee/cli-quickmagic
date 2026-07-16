// commands/generate.js — tạo ảnh/video AI. --ref/--image: URL giữ nguyên, file local → base64 data URI.
const fs = require('fs');
const path = require('path');
const api = require('../api');
const jobs = require('./jobs');

const MAX_LOCAL_BYTES = 8 * 1024 * 1024; // cảnh báo khi file > 8MB (body giới hạn ~10MB)
const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

// URL/data URI → giữ nguyên; file local → data:<mime>;base64,...
function resolveInputImage(ref) {
  if (/^https?:\/\//i.test(ref) || /^data:/i.test(ref)) return ref;
  const abs_path = path.resolve(ref);
  const ext = path.extname(abs_path).toLowerCase();
  const mime = MIME_BY_EXT[ext] || 'image/png';
  const buf = fs.readFileSync(abs_path);
  if (buf.length > MAX_LOCAL_BYTES) {
    console.warn(`Cảnh báo: ${ref} > 8MB — body giới hạn ~10MB, nên dùng URL thay vì file local.`);
  }
  return `data:${mime};base64,${buf.toString('base64')}`;
}

function resolveInputImages(refs) {
  if (!refs || !refs.length) return [];
  return refs.map(resolveInputImage);
}

// generate image — POST /public/v1/images.
async function image(options) {
  const ref_image_urls = resolveInputImages(options.ref);
  const num_images = parseInt(options.n, 10) || 1;
  const body = { prompt: options.prompt, model: options.model, num_images };
  if (options.quality) body.quality = options.quality;
  if (options.aspectRatio) body.aspect_ratio = options.aspectRatio;
  if (ref_image_urls.length) body.ref_image_urls = ref_image_urls;

  const data = await api.call('POST', '/images', { body });
  const job_ids = (data.jobs || []).map((j) => j.job_id);
  console.log(`Đã tạo ${job_ids.length} job ảnh: ${job_ids.join(', ')}`);
  console.log(`Credit tạm giữ: ${data.credits_held ?? '?'} · Số dư: ${data.balance ?? '?'}`);

  if (options.wait) await jobs.waitAll(job_ids, options.out);
}

// generate video — POST /public/v1/videos.
async function video(options) {
  const image_urls = resolveInputImages(options.image);
  const body = { prompt: options.prompt, model: options.model };
  if (options.duration) body.duration = options.duration;
  if (options.resolution) body.resolution = options.resolution;
  if (options.aspectRatio) body.aspect_ratio = options.aspectRatio;
  if (image_urls.length) body.image_urls = image_urls;
  // --mode reference|frames (R2V 260706): server validate theo model; bỏ trống = default model.
  if (options.mode) body.image_mode = options.mode;

  const data = await api.call('POST', '/videos', { body });
  const job_id = data.job_id;
  console.log(`Đã tạo job video: ${job_id}`);
  console.log(`Credit tạm giữ: ${data.credits_held ?? '?'} · Số dư: ${data.balance ?? '?'}`);

  if (options.wait) await jobs.waitAll([job_id], options.out);
}

module.exports = { image, video };
