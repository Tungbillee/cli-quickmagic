// commands/jobs.js — theo dõi job: get / wait / waitAll + tải kết quả.
const fs = require('fs');
const path = require('path');
const api = require('../api');

const POLL_INTERVAL_MS = 2500;
// Trạng thái kết thúc (M6 — union các status server có thể trả sau chuẩn hoá).
const TERMINAL_STATUSES = new Set(['completed', 'error', 'failed', 'success', 'stalled', 'timeout']);
const SUCCESS_STATUSES = new Set(['completed', 'success']);

// [P3 portrait, plans/260818-1521 bước 9] Ảnh người thật Seedance 2.x đi qua kho ảo pass-through —
// job có thể đứng "đang xử lý" tới ~10' ở lần đầu dùng 1 ảnh. R12: jobs-view có thể còn đánh dấu
// job xếp hàng >15' là 'stalled' (fix ở BE phase sau) → agent/script CHẠY --wait tuyệt đối KHÔNG
// được suy ra "job kẹt, tạo job mới thử lại" (tạo job đôi, trừ tiền 2 lần). portrait_state đọc trực
// tiếp từ response — override cách hiểu bất kể server còn gắn status gì.
const PORTRAIT_PREPARING_STATES = new Set(['awaiting_asset', 'asset_ready']);

// Gợi ý theo error_code B′ (đối chiếu backend-quick-magic/services/portrait/portrait-errors.js — 17 mã).
const PORTRAIT_HINTS = {
  PORTRAIT_PUBLIC_FIGURE: 'dùng ảnh người thường, không phải người nổi tiếng',
  PORTRAIT_MINOR: 'dùng ảnh người lớn, không phải trẻ em',
  PORTRAIT_NSFW: 'dùng ảnh khác, tránh nội dung nhạy cảm',
  PORTRAIT_GEMINI_UNAVAILABLE: 'thử lại sau vài phút',
  PORTRAIT_ASSET_FAILED: 'thử ảnh khác, rõ mặt, chỉ 1 người',
  PORTRAIT_ASSET_REJECTED: 'ảnh bị bộ lọc nội dung từ chối (người nổi tiếng/trẻ em/nhạy cảm/bản quyền) — dùng ảnh khác',
  PORTRAIT_TIMEOUT: 'thử lại sau vài phút',
  PORTRAIT_QUOTA_FULL: 'thử lại sau vài phút',
  PORTRAIT_IMAGE_HOST: 'tải ảnh lên QM trước (dùng --image <file>)',
  PORTRAIT_IMAGE_FETCH_FAILED: 'thử lại sau vài phút',
  PORTRAIT_PROVIDER_ERROR: 'thử lại sau vài phút',
  PORTRAIT_PROVIDER_FAILED: 'ảnh bị từ chối theo chính sách nội dung (người nổi tiếng/trẻ em/nhạy cảm/bản quyền) — dùng ảnh khác',
  PORTRAIT_COPYRIGHT: 'ảnh bị từ chối vì bản quyền/quyền hình ảnh (người nổi tiếng, nhân vật/tác phẩm được bảo hộ) — dùng ảnh khác',
  PORTRAIT_DISABLED: 'đổi --model gemini-omni (nhận ảnh người thật)',
  PORTRAIT_TOO_MANY_IMAGES: 'bớt số ảnh có người thật trong yêu cầu',
  PORTRAIT_VIDEO_REF_UNSUPPORTED: 'dùng --image thay --video-ref, hoặc đổi model',
  REAL_PERSON_BLOCKED: 'đổi --model gemini-omni (nhận ảnh người thật)',
};
function hintFor(code) {
  const h = PORTRAIT_HINTS[code];
  return h ? ` — gợi ý: ${h}` : '';
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// jobs get <id> — in JSON chi tiết job.
async function get(id) {
  const data = await api.call('GET', `/jobs/${id}`);
  console.log(JSON.stringify(data, null, 2));
}

// Tải result_url → ghi file, tên lấy từ URL (bỏ query).
async function download(url, out_dir) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`tải file thất bại: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const url_name = path.basename(new URL(url).pathname) || `download-${Date.now()}`;
  fs.mkdirSync(out_dir, { recursive: true });
  const dest = path.join(out_dir, url_name);
  fs.writeFileSync(dest, buf);
  console.log(`Đã tải: ${dest}`);
  return dest;
}

// Poll 1 job mỗi 2.5s tới trạng thái kết thúc; tải kết quả nếu thành công + có --out.
async function waitOne(id, out_dir) {
  for (;;) {
    const data = await api.call('GET', `/jobs/${id}`);
    const status = data.status;

    // [P3 portrait, R12] job đang chuẩn bị ảnh có người thật — KHÔNG coi là stalled/lỗi, KHÔNG gợi ý
    // chạy lại lệnh dù đợi lâu. In thẳng rồi tiếp tục poll, bỏ qua nhánh TERMINAL_STATUSES lượt này
    // (server có deadline riêng ~10' sẽ tự chuyển job sang failed thật nếu quá hạn — vòng lặp không treo mãi).
    if (PORTRAIT_PREPARING_STATES.has(data.portrait_state)) {
      console.log(`[${id}] đang chuẩn bị ảnh có người thật (tối đa ~10 phút) — đừng tạo job mới…`);
      await sleep(POLL_INTERVAL_MS);
      continue;
    }

    const progress = data.progress != null ? ` (${data.progress}%)` : '';
    console.log(`[${id}] ${status}${progress}`);
    if (TERMINAL_STATUSES.has(status)) {
      if (SUCCESS_STATUSES.has(status)) {
        if (data.result_url && out_dir) await download(data.result_url, out_dir);
      } else if (data.error_code) {
        console.error(`[${id}] Lỗi [${data.error_code}]: ${data.error || status}${hintFor(data.error_code)}`);
      } else {
        console.error(`[${id}] job lỗi: ${data.error || status}`);
      }
      return data;
    }
    await sleep(POLL_INTERVAL_MS);
  }
}

// jobs wait <id> [--out dir] — chờ 1 job, exit 1 nếu thất bại.
async function wait(id, options) {
  const data = await waitOne(id, options && options.out);
  if (!SUCCESS_STATUSES.has(data.status)) process.exit(1);
}

// Chờ nhiều job tuần tự (dùng cho generate --wait); exit 1 nếu có job thất bại.
async function waitAll(ids, out_dir) {
  let has_error = false;
  for (const id of ids) {
    const data = await waitOne(id, out_dir);
    if (!SUCCESS_STATUSES.has(data.status)) has_error = true;
  }
  if (has_error) process.exit(1);
}

module.exports = { get, wait, waitAll, download };
