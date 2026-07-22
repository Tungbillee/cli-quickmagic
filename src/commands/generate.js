// commands/generate.js — tạo ảnh/video AI. --ref/--image: URL giữ nguyên; file local →
// upload presigned (>64KB) hoặc base64 nhỏ — xem src/media.js [260722].
const api = require('../api');
const jobs = require('./jobs');
const { resolveMediaInputs } = require('../media');

// generate image — POST /public/v1/images.
async function image(options) {
  const ref_image_urls = await resolveMediaInputs(options.ref);
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
  const image_urls = await resolveMediaInputs(options.image);
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
