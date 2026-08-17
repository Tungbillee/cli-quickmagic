// api.js — fetch wrapper Bearer + auto-refresh (sớm 60s / retry 1 lần khi 401).
// H5: lockfile ~/.quickmagic/refresh.lock chống 2 process refresh đồng thời (revoke family).
const fs = require('fs');
const config = require('./config');
const { refresh } = require('./oauth');

const EARLY_REFRESH_MS = 60000; // refresh sớm khi access token còn < 60s
const LOCK_MAX_TRIES = 50; // chờ tối đa ~5s để lấy lock
const LOCK_WAIT_MS = 100;

// H5 — lockfile best-effort (kết hợp grace-window server P1). Tự giải phóng sau khi xong.
async function withRefreshLock(fn) {
  for (let i = 0; i < LOCK_MAX_TRIES; i += 1) {
    let fd;
    try {
      fd = fs.openSync(config.LOCK_FILE, 'wx'); // 'wx' — lỗi nếu lock đã tồn tại
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      await new Promise((r) => setTimeout(r, LOCK_WAIT_MS)); // đang có process khác refresh → chờ
      continue;
    }
    try {
      return await fn();
    } finally {
      fs.closeSync(fd);
      try {
        fs.unlinkSync(config.LOCK_FILE);
      } catch {
        // lock đã bị xoá — bỏ qua
      }
    }
  }
  return fn(); // hết thời gian chờ → cứ refresh (grace-window server đỡ)
}

function doRefresh() {
  return withRefreshLock(refresh);
}

// Gọi REST /public/v1<rest_path>. Trả về trường `data`. Ném lỗi khi HTTP lỗi hoặc success=false.
async function call(method, rest_path, { body } = {}) {
  let creds = config.load();
  if (!creds || (!creds.access_token && !creds.refresh_token)) {
    throw new Error('Chưa đăng nhập. Chạy: quickmagic auth login');
  }

  // Refresh sớm khi access token sắp hết hạn (bỏ qua nếu không có expires_at/refresh_token — env CI).
  if (creds.expires_at && creds.refresh_token && creds.expires_at - Date.now() < EARLY_REFRESH_MS) {
    await doRefresh();
    creds = config.load();
  }

  const doFetch = () =>
    fetch(`${config.restBase(creds.api_url)}${rest_path}`, {
      method,
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        'content-type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

  let res = await doFetch();
  if (res.status === 401 && creds.refresh_token) {
    await doRefresh(); // 401 → refresh 1 lần rồi retry
    creds = config.load();
    res = await doFetch();
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    const err = new Error(json.message || `HTTP ${res.status}`);
    err.code = json.code; // [plans/260817-2339 P4] giữ code REST để lệnh gọi phía trên in "Lỗi [code]: message"
    throw err;
  }
  return json.data;
}

module.exports = { call };
