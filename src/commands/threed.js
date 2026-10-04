// commands/threed.js — cảnh Xưởng 3D (3D Bunshin): list / open / run / op / glb qua REST /public/v1/threed.
'use strict';
const fs = require('fs/promises');
const api = require('../api');

const print = (value) => console.log(JSON.stringify(value, null, 2));
const SLEEP = (ms) => new Promise((r) => setTimeout(r, ms));
const TERMINAL = new Set(['succeeded', 'failed']); // CHECK của sc3d_worker_ops chỉ có 6 trạng thái; timeout/conflict đều ghi 'failed'
// Mutation có thể chờ khoá cảnh tới deadline+300 s rồi chạy thêm deadline (mặc định 200 s) ⇒ ~700 s; chừa thêm hàng chờ.
const WAIT_LIMIT_MS = 12 * 60 * 1000;
const POLL_MS = 2000;
const MAX_POLL_ERRORS = 5; // lỗi mạng/502/503 liên tiếp trước khi bỏ chờ — op vẫn chạy trên server
const EXIT_STILL_RUNNING = 2; // khác mã 1 (op thất bại): script phân biệt được "chưa xong" với "hỏng"
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
  const later = `qm 3d op ${started.op_id}`;
  if (!opts.wait) {
    print(started);
    console.error(`Xem kết quả: ${later}`); // stderr: stdout chỉ giữ JSON cho script/agent đọc
    return;
  }
  // In op_id TRƯỚC khi chờ: lệnh có dừng giữa chừng thì vẫn xem lại được, không phải chạy lại (chạy lại = sửa cảnh 2 lần).
  console.error(`Đang chạy ${started.op_id} — dừng giữa chừng thì xem lại bằng: ${later}`);
  const t0 = Date.now();
  let errors = 0;
  for (;;) {
    let v;
    try {
      v = await api.call('GET', `/threed/operations/${enc(started.op_id)}`);
      errors = 0;
    } catch (e) {
      errors += 1;
      if (errors >= MAX_POLL_ERRORS) throw Object.assign(new Error(`${e.message} — op vẫn có thể đang chạy, xem lại bằng: ${later}`), { code: e.code });
      await SLEEP(POLL_MS);
      continue;
    }
    if (TERMINAL.has(v.status)) {
      print(v);
      if (v.status !== 'succeeded') {
        const err = v.error || {};
        const hint = err.code === 'revision_conflict' ? ' — cảnh vừa đổi, chạy lại lệnh để dùng revision mới' : '';
        console.error(`Lỗi: [${err.code || 'failed'}] ${err.message || 'op thất bại'}${hint}`);
        process.exitCode = 1; // không process.exit(): khi stdout là pipe, thoát ngay làm cụt JSON vừa in
      }
      return;
    }
    if (Date.now() - t0 > WAIT_LIMIT_MS) {
      console.error(`Hết ${WAIT_LIMIT_MS / 60000} phút chờ, op ${started.op_id} vẫn "${v.status}". Xem tiếp: ${later}`);
      process.exitCode = EXIT_STILL_RUNNING;
      return;
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
