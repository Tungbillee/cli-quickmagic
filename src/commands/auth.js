// commands/auth.js — login / logout / status.
const oauth = require('../oauth');
const config = require('../config');
const api = require('../api');

// Đăng nhập qua browser (OAuth PKCE). Cờ --api-url ghi đè URL gốc.
async function login(options) {
  const api_url = config.apiUrl(options && options.apiUrl);
  await oauth.login(api_url);
}

// Đăng xuất — xoá credentials.json.
function logout() {
  config.clear();
  console.log('Đã đăng xuất.');
}

// Trạng thái — in email/số dư qua GET /public/v1/credits, hoặc báo chưa đăng nhập (exit 1).
async function status() {
  const creds = config.load();
  if (!creds || (!creds.access_token && !creds.refresh_token)) {
    console.log('Chưa đăng nhập. Chạy: quickmagic auth login');
    process.exit(1);
  }
  const data = await api.call('GET', '/credits');
  if (data && data.email) console.log(`Email:   ${data.email}`);
  console.log(`Số dư:   ${(data && data.balance) ?? 0} credit`);
  if (data && data.plan) console.log(`Gói:     ${data.plan}`);
  console.log(`API URL: ${creds.api_url || config.DEFAULT_API_URL}`);
}

module.exports = { login, logout, status };
