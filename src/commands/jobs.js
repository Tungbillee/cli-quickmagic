// commands/jobs.js — theo dõi job: get / wait / waitAll + tải kết quả.
const fs = require('fs');
const path = require('path');
const api = require('../api');

const POLL_INTERVAL_MS = 2500;
// Trạng thái kết thúc (M6 — union các status server có thể trả sau chuẩn hoá).
const TERMINAL_STATUSES = new Set(['completed', 'error', 'failed', 'success', 'stalled', 'timeout']);
const SUCCESS_STATUSES = new Set(['completed', 'success']);

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
    const progress = data.progress != null ? ` (${data.progress}%)` : '';
    console.log(`[${id}] ${status}${progress}`);
    if (TERMINAL_STATUSES.has(status)) {
      if (SUCCESS_STATUSES.has(status)) {
        if (data.result_url && out_dir) await download(data.result_url, out_dir);
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
