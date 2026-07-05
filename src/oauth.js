// oauth.js — OAuth PKCE S256 + DCR + loopback listener + exchange + refresh.
// H8/A2: mở http server TRƯỚC để biết port → redirect_uri http://127.0.0.1:<port>/callback.
const crypto = require('crypto');
const http = require('http');
const open = require('open');
const config = require('./config');

const LOGIN_TIMEOUT_MS = 120000; // 2 phút chờ đăng nhập qua browser
const REDIRECT_PATH = '/callback';
const OAUTH_SCOPE = 'openid email offline_access';

// base64url encode (bỏ padding, thay +/ → -_).
function toBase64Url(buf) {
  return buf
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Sinh cặp PKCE verifier + challenge (S256).
function generatePkce() {
  const verifier = toBase64Url(crypto.randomBytes(32));
  const challenge = toBase64Url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

// Đọc metadata OAuth ở ROOT (KHÔNG hardcode path endpoint — đề phòng đổi/fallback).
async function discover(api_url) {
  const res = await fetch(`${api_url}/.well-known/oauth-authorization-server`);
  if (!res.ok) throw new Error(`không lấy được metadata OAuth (HTTP ${res.status})`);
  return res.json();
}

// DCR — đăng ký client 1 lần (public client, không secret). Host-only redirect → port bất kỳ.
async function ensureClient(meta, existing_cfg) {
  if (existing_cfg?.client_id) return existing_cfg.client_id;
  const res = await fetch(meta.registration_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Quick Magic CLI',
      redirect_uris: ['http://127.0.0.1/callback'],
      token_endpoint_auth_method: 'none',
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
    }),
  });
  if (!res.ok) throw new Error(`DCR thất bại (HTTP ${res.status})`);
  const data = await res.json();
  return data.client_id;
}

// Đổi code/refresh_token lấy token (application/x-www-form-urlencoded).
async function exchange(token_endpoint, params) {
  const res = await fetch(token_endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`token endpoint ${res.status}: ${text}`);
  }
  return res.json();
}

// Chuẩn hoá token response → { access_token, refresh_token, expires_at }.
function normalize(tok) {
  return {
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    expires_at: Date.now() + (tok.expires_in || 3600) * 1000,
  };
}

// Mở loopback listener TRƯỚC, trả { server, port } để biết port trước khi authorize (H8/A2).
function startLoopback() {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

// Chờ callback trên loopback → trả authorization code (kiểm tra state chống CSRF).
function waitForCode(server, expected_state) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      server.close();
      reject(new Error('hết thời gian chờ đăng nhập (2 phút)'));
    }, LOGIN_TIMEOUT_MS);
    server.on('request', (req, res) => {
      const parsed = new URL(req.url, 'http://127.0.0.1');
      if (parsed.pathname !== REDIRECT_PATH) {
        res.writeHead(404);
        return res.end();
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end('<h3>Đăng nhập Quick Magic thành công. Quay lại terminal.</h3>');
      clearTimeout(timer);
      server.close();
      const err = parsed.searchParams.get('error');
      const code = parsed.searchParams.get('code');
      const got_state = parsed.searchParams.get('state');
      if (err) return reject(new Error(`OAuth trả lỗi: ${err}`));
      if (got_state !== expected_state) return reject(new Error('state không khớp (nghi CSRF)'));
      if (!code) return reject(new Error('không nhận được authorization code'));
      resolve(code);
    });
    server.on('error', reject);
  });
}

// Luồng login: discover → DCR → PKCE → mở browser → loopback nhận code → exchange → lưu.
async function login(api_url) {
  const meta = await discover(api_url);
  const existing_cfg = config.load();
  const client_id = await ensureClient(meta, existing_cfg);
  const { verifier, challenge } = generatePkce();
  const state = toBase64Url(crypto.randomBytes(16));

  const { server, port } = await startLoopback(); // mở listener TRƯỚC để biết port
  const redirect_uri = `http://127.0.0.1:${port}${REDIRECT_PATH}`;
  const code_promise = waitForCode(server, state);

  const auth_url = new URL(meta.authorization_endpoint);
  auth_url.search = new URLSearchParams({
    response_type: 'code',
    client_id,
    redirect_uri,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    scope: OAUTH_SCOPE,
    state,
  }).toString();

  console.log('Mở trình duyệt để đăng nhập...');
  console.log(`Nếu trình duyệt không tự mở, hãy dán URL sau:\n${auth_url.toString()}`);
  try {
    await open(auth_url.toString());
  } catch {
    console.log('(Không mở được trình duyệt tự động — dùng URL ở trên.)');
  }

  const code = await code_promise;
  const tok = await exchange(meta.token_endpoint, {
    grant_type: 'authorization_code',
    code,
    redirect_uri,
    client_id,
    code_verifier: verifier,
  });
  config.save({ api_url, client_id, ...normalize(tok) });
  console.log('Đăng nhập thành công.');
}

// Refresh access token (được bọc lockfile ở api.js chống refresh song song).
async function refresh() {
  const cfg = config.load();
  if (!cfg?.refresh_token) throw new Error('chưa đăng nhập (thiếu refresh_token)');
  const meta = await discover(cfg.api_url);
  const params = { grant_type: 'refresh_token', refresh_token: cfg.refresh_token };
  if (cfg.client_id) params.client_id = cfg.client_id; // chỉ gửi khi có (public client)
  const tok = await exchange(meta.token_endpoint, params);
  config.save({ ...cfg, ...normalize(tok) });
  return cfg.api_url;
}

module.exports = { login, refresh, discover };
