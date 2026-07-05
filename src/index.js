#!/usr/bin/env node
// index.js — điểm vào CLI quickmagic (commander wiring). Node >=18, CommonJS.
const { program } = require('commander');

const auth = require('./commands/auth');
const generate = require('./commands/generate');
const jobs = require('./commands/jobs');
const models = require('./commands/models');
const credits = require('./commands/credits');
const tools = require('./commands/tools');

const collect = (v, acc) => { acc.push(v); return acc; };

program
  .name('quickmagic')
  .description('Quick Magic CLI — tạo ảnh/video AI qua REST API (OAuth PKCE)')
  .version('1.0.0');

// ── auth ─────────────────────────────────────────────────────────────────────
const auth_cmd = program.command('auth').description('Đăng nhập / đăng xuất / trạng thái');
auth_cmd
  .command('login')
  .description('Đăng nhập qua trình duyệt (OAuth PKCE)')
  .option('--api-url <url>', 'URL gốc API (mặc định https://api.quickmagic.vn)')
  .action(auth.login);
auth_cmd.command('logout').description('Đăng xuất, xoá credentials').action(auth.logout);
auth_cmd.command('status').description('Xem email / số dư').action(auth.status);

// ── generate ─────────────────────────────────────────────────────────────────
const gen_cmd = program.command('generate').description('Tạo ảnh / video AI');
gen_cmd
  .command('image')
  .description('Tạo ảnh AI')
  .requiredOption('--prompt <p>', 'Mô tả ảnh')
  .option('--model <m>', 'Model', 'qimi_3')
  .option('--quality <q>', 'Chất lượng')
  .option('--aspect-ratio <r>', 'Tỉ lệ khung (vd 1:1, 16:9)')
  .option('--n <n>', 'Số ảnh', '1')
  .option('--ref <r...>', 'Ảnh tham chiếu (URL hoặc file local, lặp nhiều lần)')
  .option('--wait', 'Chờ tới khi job hoàn tất')
  .option('--out <dir>', 'Thư mục lưu kết quả (dùng kèm --wait)')
  .action(generate.image);
gen_cmd
  .command('video')
  .description('Tạo video AI')
  .requiredOption('--prompt <p>', 'Mô tả video')
  .requiredOption('--model <m>', 'Model')
  .option('--duration <d>', 'Thời lượng (giây)')
  .option('--resolution <r>', 'Độ phân giải (vd 720p, 1080p)')
  .option('--aspect-ratio <r>', 'Tỉ lệ khung')
  .option('--image <i...>', 'Ảnh đầu vào (URL hoặc file local, lặp nhiều lần)')
  .option('--wait', 'Chờ tới khi job hoàn tất')
  .option('--out <dir>', 'Thư mục lưu kết quả (dùng kèm --wait)')
  .action(generate.video);

// ── jobs ─────────────────────────────────────────────────────────────────────
const jobs_cmd = program.command('jobs').description('Theo dõi job');
jobs_cmd.command('get <id>').description('Xem chi tiết job (JSON)').action(jobs.get);
jobs_cmd
  .command('wait <id>')
  .description('Chờ job tới khi hoàn tất')
  .option('--out <dir>', 'Thư mục lưu kết quả')
  .action((id, options) => jobs.wait(id, options));

// ── models ───────────────────────────────────────────────────────────────────
const models_cmd = program.command('models').description('Model AI');
models_cmd
  .command('list')
  .description('Liệt kê model')
  .option('--type <t>', 'Loại: image | video', 'image')
  .action(models.list);

// ── credits ──────────────────────────────────────────────────────────────────
program.command('credits').description('Xem số dư credit').action(credits.show);

// ── Nhập liệu (không tốn credit) ───────────────────────────────────────────────
program.command('scrape <url>').description('Quét ảnh + tên sản phẩm từ link trang').action(tools.scrape);
program.command('import <url>').description('Nhập ảnh/video từ POST TikTok/Instagram')
  .option('--media <m>', 'image | video', 'image').option('--max <n>', 'Số ảnh tối đa').action(tools.importSocial);
program.command('assets <kind>').description('Liệt kê tài sản: products | outfits | kols')
  .option('--limit <n>', 'Giới hạn').action(tools.assets);
program.command('analyze <video_url>').description('Phân tích video quảng cáo → kịch bản (15cr)')
  .option('--product-id <id>', 'Sản phẩm trong tủ').action(tools.analyze);

// ── Marketing ──────────────────────────────────────────────────────────────────
const mkt = program.command('marketing').description('Marketing video');
mkt.command('modes').description('Liệt kê mode + bảng giá theo duration').action(tools.marketingModes);
mkt.command('video').description('Tạo video marketing (tốn credit theo duration)')
  .requiredOption('--mode <id>', 'mode_id (xem marketing modes)')
  .option('--product-id <id>').option('--avatar-id <id>').option('--avatar-kind <k>')
  .option('--duration <d>', '8/10/12/15').option('--aspect-ratio <r>').option('--crid <id>', 'client_request_id')
  .action(tools.marketingVideo);

// ── Product / Fashion ──────────────────────────────────────────────────────────
program.command('product').description('Tạo ảnh sản phẩm AI')
  .requiredOption('--refs <r...>', 'product_id hoặc URL/base64 (1-3)')
  .option('--types <t...>', 'product|poster|infographic|composite', ['product'])
  .option('--count <n>').option('--kol-id <id>').option('--instruction <s>').option('--model <m>').option('--crid <id>')
  .action(tools.product);
program.command('fashion').description('Tạo ảnh thời trang AI')
  .requiredOption('--outfit <id...>', 'outfit_ids (xem assets outfits)')
  .option('--mode <m>', 'kol_outfit/outfit_only/...').option('--kol-kind <k>').option('--kol-id <id>').option('--model <m>').option('--crid <id>')
  .action(tools.fashion);

// ── Ảnh ────────────────────────────────────────────────────────────────────────
program.command('edit <image>').description('Sửa ảnh: restore/upscale/beauty/muscle/color_boost')
  .requiredOption('--tool <t>').option('--model <m>', 'qimi_2.5|qimi_3', 'qimi_3')
  .option('--upscale-target <t>', '2k|4k').option('--style <s...>').option('--crid <id>').action(tools.edit);
program.command('tryon').description('Thử đồ ảo (virtual try-on)')
  .requiredOption('--model-image <img>', 'Ảnh người mẫu (URL/base64)')
  .option('--type <t>', 'full|upper', 'full').option('--model <m>', 'qimi_1.5|qimi_2.5|qimi_3', 'qimi_3')
  .option('--garment <img>').option('--upper <img>').option('--lower <img>').option('--background <img>').option('--prompt <p>').option('--crid <id>')
  .action((o) => tools.tryon({ ...o, model_image: o.modelImage }));

// ── Video nặng / audio ─────────────────────────────────────────────────────────
program.command('stt <audio_url>').description('Chuyển giọng nói → văn bản')
  .option('--translate <lang>', 'Dịch sang ngôn ngữ').option('--crid <id>').action(tools.stt);
program.command('subtitle <video_url>').description('Thêm phụ đề (tùy chọn lồng tiếng)')
  .option('--dub', 'Bật lồng tiếng').option('--translate <lang>').option('--crid <id>').action(tools.subtitle);
program.command('split <video_url>').description('Cắt video dài → clip ngắn')
  .option('--mode <m>', 'auto|specific', 'auto').option('--title-lang <l>').option('--translate <lang>').option('--crid <id>').action(tools.split);
program.command('motion <video_url>').description('Áp chuyển động video vào ảnh (Kling)')
  .requiredOption('--image <url...>', 'Ảnh áp motion (1-20)')
  .option('--model <m>').option('--mode <m>', 'standard|professional').option('--prompt <p>').option('--crid <id>').action(tools.motion);

program.parseAsync(process.argv).catch((e) => {
  console.error('Lỗi:', e.message);
  process.exit(1);
});
