// commands/apps.js — Ứng dụng React SSR trên <slug>.quickmagic.app (Apps đợt B): create / list / status / deploy / publish / remove.
// KHÔNG có `apps db` / `apps secrets` (bề mặt nhạy cảm — chỉ agent qua MCP). repo-access in clone_url ra stdout theo yêu cầu tường minh.
const api = require('../api');

const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));

function printApp(a) {
  console.log(`${a.title || '(chưa tên)'}  [${a.id}]`);
  console.log(`  URL:      ${a.url || '—'}`);
  console.log(`  Deploy:   ${a.deploy_status || '—'}${a.last_build ? ` (build #${a.last_build.id} ${a.last_build.status}${a.last_build.error_code ? ' ' + a.last_build.error_code : ''})` : ''}`);
  console.log(`  Duyệt:    ${a.review_status || '—'} · công khai: ${a.is_public ? 'có' : 'không'} · cover: ${a.thumb_url ? 'có' : 'chưa'} · DB: ${a.has_db ? 'có' : 'không'}`);
  if (a.has_unbuilt_commits) console.log('  ⚠️ Có commit chưa deploy — chạy: qm apps deploy <app_id>');
  if (a.last_build && a.last_build.error_text) console.log(`  Lỗi build: ${String(a.last_build.error_text).slice(0, 300)}`);
}

async function create(options) {
  const body = { title: options.title, subdomain: options.subdomain, category: options.category, description: options.description };
  if (options.from) body.from_app_id = options.from;
  const data = await api.call('POST', '/apps', { body });
  console.log(`Đã tạo app ${data.id}${data.remixed_from ? ` (remix từ "${data.remixed_from.title}")` : ''}`);
  printApp(data);
  console.log('Tiếp: qm apps repo-access <app_id> → git clone → sửa → push → qm apps deploy <app_id>');
}
async function list() {
  const data = await api.call('GET', '/apps');
  const apps = data.apps || [];
  if (!apps.length) { console.log('Chưa có app nào. Tạo: qm apps create --title "Tên app"'); return; }
  const id_w = 36, slug_w = Math.max(4, ...apps.map((a) => String(a.slug || '').length));
  console.log(`${'APP_ID'.padEnd(id_w)}  ${'SLUG'.padEnd(slug_w)}  DEPLOY     DUYỆT     PUBLIC  TITLE`);
  for (const a of apps) console.log(`${a.id.padEnd(id_w)}  ${String(a.slug || '').padEnd(slug_w)}  ${String(a.deploy_status || '').padEnd(9)}  ${String(a.review_status || '').padEnd(8)}  ${a.is_public ? 'có ' : 'không'}   ${a.title || ''}`);
}
async function status(app_id, options) {
  const data = await api.call('GET', `/apps/${encodeURIComponent(app_id)}`);
  if (options && options.json) { console.log(JSON.stringify(data, null, 2)); return; }
  printApp(data);
}
async function repoAccess(app_id) {
  const data = await api.call('POST', `/apps/${encodeURIComponent(app_id)}/repo-access`, { body: {} });
  // In clone_url có token TTL 15' — người dùng CLI chủ động xin, KHÔNG log ở nơi khác.
  console.log(`Quyền push repo (hết hạn ${data.expires_at}):`);
  console.log(data.clone_url);
  console.log(`git clone ${data.clone_url} app && cd app`);
}
async function deploy(app_id, options) {
  const data = await api.call('POST', `/apps/${encodeURIComponent(app_id)}/deploy`, { body: {} });
  console.log(`Đã xếp hàng build #${data.build_id} → ${data.url}`);
  if (!options || !options.wait) { console.log('Theo dõi: qm apps status <app_id>'); return; }
  for (let i = 0; i < 60; i++) {
    await SLEEP(5000);
    const s = await api.call('GET', `/apps/${encodeURIComponent(app_id)}`);
    const b = s.last_build;
    if (b && String(b.id) === String(data.build_id) && ['succeeded', 'failed'].includes(b.status)) {
      if (b.status === 'succeeded') { console.log(`✅ Deploy xong (${Math.round((b.duration_ms || 0) / 1000)}s): ${s.url}`); return; }
      console.error(`❌ Build thất bại (${b.error_code || 'lỗi'}): ${String(b.error_text || '').slice(0, 400)}`); process.exit(1);
    }
    process.stdout.write(`  … ${b ? b.step || b.status : 'queued'}\r`);
  }
  console.error('Hết 5 phút chưa xong — kiểm: qm apps status <app_id>'); process.exit(1);
}
async function publish(app_id, options) {
  try {
    const data = await api.call('POST', `/apps/${encodeURIComponent(app_id)}/publish`, { body: { is_public: !(options && options.unlist) } });
    console.log(data.is_public ? `✅ Đã công khai lên feed Ứng dụng: ${data.url}` : 'Đã gỡ khỏi feed (link trực tiếp vẫn hoạt động).');
  } catch (e) {
    const m = String(e.message || '');
    if (/APP_REVIEW_PENDING|chờ duyệt/.test(m)) { console.log('⏳ App đang chờ duyệt nội dung (app đầu tiên của tài khoản được duyệt tay). Link trực tiếp vẫn dùng được.'); return; }
    throw e;
  }
}
async function remove(app_id, options) {
  if (!options || !options.yes) { console.error('Xoá VĨNH VIỄN app (Worker + DB + repo, subdomain khoá mãi). Xác nhận bằng --yes.'); process.exit(1); }
  const data = await api.call('DELETE', `/apps/${encodeURIComponent(app_id)}`);
  console.log(`Đã xoá app ${data.slug || app_id}.`);
}

module.exports = { create, list, status, repoAccess, deploy, publish, remove };
