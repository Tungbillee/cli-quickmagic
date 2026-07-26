// commands/elements.js — thư viện element tái dùng: xem `@tag` để trỏ trong prompt video, và tạo mới.
// BE dịch `@tag` trong prompt thành "Image N (mô tả)" lúc gửi provider → giữ nhân vật/sản phẩm
// nhất quán qua nhiều cảnh. Nhớ đưa ảnh element vào `--image` kèm `--mode reference`.
const api = require('../api');
const { resolveMediaInput } = require('../media');

async function list(options) {
  const limit = (options && options.limit) || 50;
  const data = await api.call('GET', `/elements?limit=${encodeURIComponent(limit)}`);
  const items = (data && data.elements) || [];
  if (!items.length) {
    console.log('Chưa có element nào. Tạo bằng: qm elements create --name "Áo dài đỏ" --image ./ao.jpg --desc "..."');
    return;
  }

  const tag_w = Math.max(3, ...items.map((e) => `@${e.tag}`.length));
  const name_w = Math.max(4, ...items.map((e) => (e.name || '').length));
  console.log(`${'TAG'.padEnd(tag_w)}  ${'TÊN'.padEnd(name_w)}  MÔ TẢ`);
  console.log('─'.repeat(tag_w + name_w + 30));
  for (const e of items) {
    const desc = (e.description || '').replace(/\s+/g, ' ');
    const short = desc.length > 60 ? `${desc.slice(0, 57)}...` : desc;
    console.log(`${`@${e.tag}`.padEnd(tag_w)}  ${(e.name || '').padEnd(name_w)}  ${short}`);
  }
  console.log(`\nDùng: qm generate video --prompt "cô gái mặc @${items[0].tag} đi dạo" --image <url-element> --mode reference --model seedance-2-0`);
}

async function create(options) {
  // File local → tự upload presigned lên host Quick Magic (server chỉ nhận URL của mình).
  const media_url = await resolveMediaInput(options.image);
  const body = { name: options.name, media_url };
  if (options.desc) body.description = options.desc;
  if (options.category) body.category = options.category;
  if (options.type) body.media_type = options.type;

  const data = await api.call('POST', '/elements', { body });
  console.log(`Đã tạo element: @${data.tag} (${data.name})`);
  if (data.description) console.log(`Mô tả gửi kèm model: ${data.description}`);
  console.log(`Dùng trong prompt: "@${data.tag}"`);
}

module.exports = { list, create };
