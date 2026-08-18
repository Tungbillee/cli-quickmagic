#!/usr/bin/env node
// index.js — điểm vào CLI quickmagic (commander wiring). Node >=18, CommonJS.
const { program } = require('commander');

const auth = require('./commands/auth');
const generate = require('./commands/generate');
const elements = require('./commands/elements');
const jobs = require('./commands/jobs');
const models = require('./commands/models');
const credits = require('./commands/credits');
const tools = require('./commands/tools');
const voice = require('./commands/voice');

const collect = (v, acc) => { acc.push(v); return acc; };

program
  .name('quickmagic')
  .description('Quick Magic CLI — tạo ảnh/video AI qua REST API (OAuth PKCE)')
  .version(require('../package.json').version);

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
  .option('--image <i...>', 'Ảnh đầu vào (URL hoặc file local, lặp nhiều lần — max theo model+mode, xem qm models)')
  .option('--mode <m>', 'Chế độ ảnh: reference (nhiều ảnh tham chiếu) | frames (khung đầu/cuối, max 2). Seedance 2.x nhận ảnh người thật ở mọi chế độ (hệ thống chuẩn bị ảnh thêm ~1-3 phút lần đầu; nếu bộ lọc nội dung của model từ chối — bản quyền/chính sách — CLI in rõ lý do, credit hoàn; xem README mục "Ảnh người thật")')
  .option('--video-ref <v>', 'Video tham chiếu (URL hoặc file local, max 15s/100MB) — CHỈ model supports_video_ref (seedance-2-0/-fast). Giá = rate with-video × (giây output + giây video); không dùng chung với --image')
  .option('--seed <n>', 'Seed cố định — cùng seed + cùng prompt cho kết quả LẶP LẠI được (giữ nhất quán khi render nhiều cảnh)', parseInt)
  .option('--negative <p>', 'Mô tả thứ KHÔNG muốn xuất hiện (watermark, chữ, tay thừa…) — model nào không hỗ trợ thì bỏ qua')
  .option('--camera-fixed', 'Khoá máy quay đứng yên (không pan/zoom) — hợp cảnh xoay sản phẩm')
  .option('--no-audio', 'Tắt tiếng (không đổi giá)')
  .option('--wait', 'Chờ tới khi job hoàn tất')
  .option('--out <dir>', 'Thư mục lưu kết quả (dùng kèm --wait)')
  .action(generate.video);

// ── elements ─────────────────────────────────────────────────────────────────
// [260726] Thư viện element tái dùng: `@tag` trong prompt → BE dịch thành "Image N (mô tả)".
const elements_cmd = program.command('elements').description('Thư viện element tái dùng (@tag trong prompt)');
elements_cmd
  .command('list')
  .description('Liệt kê element + tag để trỏ trong prompt')
  .option('--limit <n>', 'Số lượng tối đa (mặc định 50)')
  .action(elements.list);
elements_cmd
  .command('create')
  .description('Lưu 1 ảnh thành element tái dùng')
  .requiredOption('--name <n>', 'Tên element, vd "Áo dài đỏ" (tag tự sinh từ tên)')
  .requiredOption('--image <i>', 'Ảnh (URL hoặc file local — tự upload)')
  .option('--desc <d>', 'Mô tả chi tiết — CHÍNH là thứ được chèn kèm ảnh vào prompt, viết càng rõ càng giữ được nhân vật')
  .option('--category <c>', 'character | location | prop | product | style | other')
  .option('--type <t>', 'image (mặc định) | video')
  .action(elements.create);

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

// ── TTS / Voices ─────────────────────────────────────────────────────────────
program
  .command('tts')
  .description('Chuyển văn bản → giọng nói (5 engine qimi_1.5/2.5/3/5/5.5)')
  .option('--text <t>', 'Văn bản cần đọc')
  .option('--file <path>', 'Đọc văn bản từ file local (thay --text)')
  .option('--model <m>', 'qimi_1.5|qimi_2.5|qimi_3|qimi_5|qimi_5.5', 'qimi_3')
  .requiredOption('--voice <v>', 'Tên giọng — xem cột VOICE của qm voices list')
  .option('--language <l>', 'Ngôn ngữ — phân biệt giọng trùng tên (xem qm voices list)')
  .option('--speed <n>', 'Tốc độ đọc 0.5-2.0 (mặc định 1) — CHỈ qimi_5/qimi_5.5')
  .option('--style <s>', 'Phong cách đọc — nhãn từ cột STYLES của qm voices list')
  .option('--title <t>', 'Tiêu đề job')
  .option('--crid <id>', 'client_request_id')
  .option('--wait', 'Chờ tới khi job hoàn tất')
  .option('--out <dir>', 'Thư mục lưu file mp3 (dùng kèm --wait)')
  .action(voice.tts);

const voices_cmd = program.command('voices').description('Giọng đọc: catalog + giọng clone của bạn');
voices_cmd
  .command('list')
  .description('Liệt kê giọng theo model')
  .requiredOption('--model <m>', 'qimi_1.5|qimi_2.5|qimi_3|qimi_5|qimi_5.5')
  .option('--language <l>', 'Lọc theo ngôn ngữ')
  .option('--search <s>', 'Lọc theo tên (không phân biệt hoa/thường)')
  .option('--limit <n>', 'Số lượng tối đa (mặc định 50, trần 100)')
  .action(voice.voicesList);
voices_cmd
  .command('clone')
  .description('Nhân bản giọng nói từ file ghi âm mẫu (dùng cho qimi_5/qimi_5.5)')
  .requiredOption('--audio <file|url>', 'File local mp3/wav/m4a 10s-5 phút ≤20MB (tự upload) hoặc URL do Quick Magic cấp (files.quickmagic.cloud)')
  .requiredOption('--name <n>', 'Tên giọng — dùng lại ở --voice của qm tts')
  .option('--crid <id>', 'client_request_id (mặc định tự sinh từ hash file+tên)')
  .option('--wait', 'Chờ tới khi giọng xử lý xong')
  .action(voice.voicesClone);
voices_cmd
  .command('delete <id>')
  .description('Xoá giọng đã clone')
  .action(voice.voicesDelete);

// ── Cutout Studio ────────────────────────────────────────────────────────────
program.command('cutout').description('Tách nền / tạo ảnh cutout trong suốt (PNG)')
  .option('--operation <o>', 'generate|from_ref|remix_describe', 'from_ref')
  .option('--ref <r...>', 'Ảnh tham chiếu (URL hoặc data:base64, tối đa 5, lặp nhiều lần)')
  .option('--prompt <p>', 'Mô tả ảnh (bắt buộc khi --operation generate)')
  .option('--model <m>', 'Model (xem qm models --type image)', 'nano-banana-2')
  .option('--aspect-ratio <r>').option('--quality <q>')
  .option('--n <n>', 'Số ảnh', '1')
  .option('--no-transparent-bg', 'Giữ nguyên nền gốc (chỉ operation=remix_describe)')
  .option('--crid <id>', 'client_request_id')
  .action(tools.cutout);

// ── Hook Studio ──────────────────────────────────────────────────────────────
const hook_cmd = program.command('hook').description('Hook Studio — video quảng cáo hài từ ảnh nhân vật + sản phẩm');
hook_cmd.command('presets').description('Liệt kê preset + option hợp lệ + giá').action(tools.hookPresets);
hook_cmd
  .command('video')
  .description('Tạo video hook (tốn credit theo preset)')
  .requiredOption('--preset <id>', 'preset_id (xem hook presets)')
  .requiredOption('--character <img>', 'Ảnh nhân vật (URL hoặc data:base64)')
  .requiredOption('--product <img>', 'Ảnh sản phẩm (URL hoặc data:base64)')
  .option('--aspect <r>', '9:16|16:9', '9:16')
  .option('--speech-lang <l>', 'Ngôn ngữ thoại (xem hook presets speech_lang_options)', 'vi')
  .option('--cta <s>', 'Call-to-action tuỳ chỉnh')
  .option('--location <img>', 'Ảnh bối cảnh (tuỳ chọn)')
  .option('--accessory <img>', 'Ảnh phụ kiện (tuỳ chọn)')
  .option('--style <s>', 'Phong cách hài (xem hook presets style_options)')
  .option('--format <f>', 'Định dạng (xem hook presets format_options)')
  .option('--resolution <r>', '720p|1080p')
  .option('--crid <id>', 'client_request_id')
  .action(tools.hookVideo);

program.parseAsync(process.argv).catch((e) => {
  console.error('Lỗi:', e.message);
  process.exit(1);
});
