// config.js — Quản lý credentials ~/.quickmagic/credentials.json (chmod 600, dir 700).
// H5: ghi atomic temp→rename; env token thắng file (CI headless, chỉ đọc không ghi).
const os = require('os');
const fs = require('fs');
const path = require('path');

const QM_DIR = path.join(os.homedir(), '.quickmagic');
const CRED_FILE = path.join(QM_DIR, 'credentials.json');
const LOCK_FILE = path.join(QM_DIR, 'refresh.lock');
// URL GỐC (root) — REST base = + '/public/v1'; discovery OAuth cũng ở root.
const DEFAULT_API_URL = process.env.QUICKMAGIC_URL || 'https://api.quickmagic.vn';

// H5 — CI headless: env token thắng file (bỏ qua browser login). Chỉ đọc, KHÔNG ghi xuống đĩa.
function getEnvCreds() {
  const access_token = process.env.QUICKMAGIC_TOKEN;
  const refresh_token = process.env.QUICKMAGIC_REFRESH_TOKEN;
  if (!access_token && !refresh_token) return null;
  return {
    api_url: DEFAULT_API_URL,
    access_token: access_token || null,
    refresh_token: refresh_token || null,
    expires_at: 0,
    _from_env: true,
  };
}

// Đọc credentials: ưu tiên env (CI) → file JSON. Trả null nếu chưa có.
function load() {
  const env_creds = getEnvCreds();
  if (env_creds) return env_creds;
  try {
    return JSON.parse(fs.readFileSync(CRED_FILE, 'utf8'));
  } catch {
    return null;
  }
}

// Ghi credentials an toàn: temp→rename atomic, quyền 600 (dir 700). Bỏ qua khi chạy bằng env.
function save(creds) {
  if (creds && creds._from_env) return; // không ghi đè xuống đĩa khi chạy bằng env token
  fs.mkdirSync(QM_DIR, { recursive: true, mode: 0o700 });
  const tmp_file = `${CRED_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp_file, JSON.stringify(creds, null, 2), { mode: 0o600 });
  fs.renameSync(tmp_file, CRED_FILE); // H5 — atomic, tránh corrupt JSON khi crash giữa write
  fs.chmodSync(CRED_FILE, 0o600);
}

// Xoá credentials (logout). Bỏ qua nếu file không tồn tại.
function clear() {
  try {
    fs.unlinkSync(CRED_FILE);
  } catch {
    // đã xoá hoặc chưa tồn tại — bỏ qua
  }
}

// Xác định api_url: cờ CLI → file → mặc định.
function apiUrl(flag) {
  return flag || load()?.api_url || DEFAULT_API_URL;
}

// C1 — REST base = root + /public/v1 (KHÔNG /v1). Discovery OAuth vẫn ở root.
function restBase(api_url) {
  return `${api_url}/public/v1`;
}

module.exports = {
  load,
  save,
  clear,
  apiUrl,
  restBase,
  CRED_FILE,
  LOCK_FILE,
  QM_DIR,
  DEFAULT_API_URL,
};
