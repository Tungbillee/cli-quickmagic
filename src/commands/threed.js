// commands/threed.js — cảnh Xưởng 3D (3D Bunshin): list / open / run / op / glb qua REST /public/v1/threed.
'use strict';
const fs = require('fs/promises');
const api = require('../api');

const print = (value) => console.log(JSON.stringify(value, null, 2));
const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));
const TERMINAL = new Set(['succeeded', 'failed']);
const WAIT_LIMIT_MS = 5 * 60 * 1000; // mutation có hạn 200 s phía máy Blender + hàng chờ
const POLL_MS = 2000;
const enc = encodeURIComponent;
// Cùng cách báo lỗi với các lệnh khác (commands/tools.js): "Lỗi: [code] message", thoát mã 1.
const run = (fn) => (...a) => fn(...a).catch((e) => { console.error('Lỗi:', e.code ? `[${e.code}] ${e.message}` : e.message); process.exit(1); });

const list = run(async () => print(await api.call('GET', '/threed/projects')));
const open = run(async (id) => print(await api.call('GET', `/threed/projects/${enc(id)}`)));
const op = run(async (op_id) => print(await api.call('GET', `/threed/operations/${enc(op_id)}`)));

const runCode = run(async (id, opts) => {
  const code = await fs.readFile(opts.code, 'utf8');
  const access = opts.query ? 'query' : 'mutation';
  // Ghim revision vừa đọc: cảnh đổi giữa chừng ⇒ server báo revision_conflict thay vì chạy trên bản cũ.
  const { project } = await api.call('GET', `/threed/projects/${enc(id)}`);
  const started = await api.call('POST', `/threed/projects/${enc(id)}/run`, { body: { code, access, expected_revision: project.revision } });
  if (!opts.wait) {
    print(started);
    console.log(`Xem kết quả: qm 3d op ${started.op_id}`);
    return;
  }
  const t0 = Date.now();
  for (;;) {
    const v = await api.call('GET', `/threed/operations/${enc(started.op_id)}`);
    if (TERMINAL.has(v.status)) {
      print(v);
      if (v.status !== 'succeeded') process.exit(1);
      return;
    }
    if (Date.now() - t0 > WAIT_LIMIT_MS) {
      console.error(`Hết ${WAIT_LIMIT_MS / 60000} phút chờ, op ${started.op_id} vẫn "${v.status}". Xem tiếp: qm 3d op ${started.op_id}`);
      process.exit(1);
    }
    await SLEEP(POLL_MS);
  }
});

const glb = run(async (id, opts) => {
  const exists = await fs.access(opts.output).then(() => true, () => false);
  if (exists) throw new Error(`File ${opts.output} đã có — chọn tên khác bằng --output (lệnh không ghi đè).`);
  const data = await api.call('GET', `/threed/projects/${enc(id)}/glb${opts.rev ? '?rev=' + enc(opts.rev) : ''}`);
  const response = await fetch(data.url);
  if (!response.ok) throw new Error(`Tải GLB lỗi HTTP ${response.status}`);
  await fs.writeFile(opts.output, Buffer.from(await response.arrayBuffer()), { flag: 'wx' }); // không ghi đè file có sẵn
  print({ file: opts.output, revision: data.revision, bytes: data.bytes });
});

module.exports = { list, open, op, runCode, glb };
