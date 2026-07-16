# Hướng dẫn phát hành `quickmagic-cli` (bấm nút)

Agent đã chuẩn bị xong repo local (git init + commit đầu tiên) và package npm sạch. File
này liệt kê đúng các bước **user tự tay bấm** — agent KHÔNG tự publish npm, KHÔNG tự tạo/push
GitHub, KHÔNG commit vào repo workspace.

Giả định dùng trong hướng dẫn này (đổi lại nếu muốn khác):

| Giá trị | Đang dùng | Đổi ở đâu nếu muốn khác |
|---|---|---|
| GitHub owner | `Tungbillee` (tài khoản đang đăng nhập qua `gh auth status`) | `package.json` (`repository`/`homepage`/`bugs`) + `README.md` + `skills/README.md` |
| Tên repo GitHub | `cli-quickmagic` (trùng tên thư mục local, KHÔNG cần đổi tên thư mục) | như trên |
| Tên gói npm | `quickmagic-cli` (đã xác nhận **còn trống** trên registry lúc chuẩn bị — xem lại ngay trước khi publish vì có thể đổi giữa lúc chuẩn bị và lúc bấm) | `package.json` (`name` + `bin`) |

---

## 0. QUAN TRỌNG NHẤT — đọc trước khi làm gì khác

CLI mặc định trỏ thẳng vào **backend production** `https://api.quickmagic.vn` (biến môi
trường `QUICKMAGIC_URL` override được, nhưng mặc định là prod — đúng theo
`MCP_PUBLIC_URL` trong `backend-quick-magic/.env.example`).

**Backend prod hiện CHƯA có code mới nhất.** Lúc chuẩn bị gói này, repo
`backend-quick-magic` (repo git riêng, khác workspace) có **227 thay đổi chưa commit**
(157 file sửa + 70 file mới) — bao gồm nhiều fix/feature liên quan trực tiếp tới CLI:
MCP tools, dispatcher (unlimited fair dispatcher), Qimi benefit (`qm credits` hiển thị
`qimi_benefit`), byteplus/hypereal provider swap, và nhiều queue khác.

**Trước khi công bố CLI cho người dùng thật trỏ vào prod:**
1. Review + commit các thay đổi cần thiết trong `backend-quick-magic` (repo riêng của nó).
2. Deploy lên server prod theo quy trình sẵn có — xem
   `backend-quick-magic/docs/deploy-process-roles.md` (3 role api/worker/cron).
3. Tự test lại bằng chính CLI này trỏ vào prod (`qm auth login`, `qm credits`,
   `qm generate image ... --wait`) TRƯỚC khi npm publish/công bố rộng rãi.

Nếu bỏ qua bước này: user cài `quickmagic-cli` xong sẽ đụng đúng những bug đã fix ở local
nhưng chưa lên prod (vd MCP tool trả lỗi, dispatcher chưa đúng, `qimi_benefit` không xuất
hiện dù đã lên gói).

---

## 1. Tạo GitHub repo public + push

**Cách A — dùng `gh` (đã đăng nhập sẵn tài khoản `Tungbillee`):**

```bash
cd "/Users/tungpc/Documents/BDLCD/electron 2025/quick-magic-new/cli-quickmagic"
gh repo create Tungbillee/cli-quickmagic --public --source=. --remote=origin \
  --description "Quick Magic CLI — generate AI images/videos, product photoshoots, hook videos and more via OAuth PKCE"
git push -u origin main
```

**Cách B — tạo trên web rồi push:**

1. Mở https://github.com/new → Owner `Tungbillee` → Repository name `cli-quickmagic` →
   Public → **KHÔNG** tick "Add a README file"/".gitignore"/"license" (repo local đã có đủ
   3 file này, tick vào sẽ tạo conflict khi push) → Create repository.
2. Gán remote + push:
   ```bash
   cd "/Users/tungpc/Documents/BDLCD/electron 2025/quick-magic-new/cli-quickmagic"
   git remote add origin https://github.com/Tungbillee/cli-quickmagic.git
   git push -u origin main
   ```

**Verify:** mở https://github.com/Tungbillee/cli-quickmagic — phải thấy đúng 1 commit,
đủ `README.md`/`LICENSE`/`package.json`/`src/`/`skills/`, KHÔNG có `node_modules/`, `out/`.

Nếu tên `cli-quickmagic` đã bị chiếm dưới account của bạn (repo cũ khác) → đổi tên repo
(vd `quickmagic-cli-tool`) và cập nhật lại 3 chỗ trong `package.json`
(`repository.url`/`homepage`/`bugs.url`) trước khi qua bước publish npm.

## 2. npm login + publish

```bash
npm login   # nếu chưa đăng nhập máy này
```

**Verify lần cuối trước khi publish** (bắt buộc — tên có thể bị người khác đăng ký giữa
lúc chuẩn bị và lúc bạn bấm publish):

```bash
cd "/Users/tungpc/Documents/BDLCD/electron 2025/quick-magic-new/cli-quickmagic"
npm view quickmagic-cli        # PHẢI báo lỗi 404 (tên còn trống)
npm pack --dry-run             # soát lại danh sách file — đối chiếu với báo cáo agent đã gửi
```

Nếu `npm view` KHÔNG báo 404 (tức tên đã bị người khác lấy) → đổi `"name"` (và `"bin"` nếu
muốn) trong `package.json` sang tên khác trước khi publish, rồi chạy lại `npm view <tên mới>`
để chắc chắn.

Publish thật (gói không scope nên không cần `--access public`):

```bash
npm publish
```

Verify: mở https://www.npmjs.com/package/quickmagic-cli.

## 3. Verify cài đặt thật (khuyến khích làm ở máy/thư mục sạch, hoặc container)

```bash
npm install -g quickmagic-cli
quickmagic --version
qm auth login                 # mặc định trỏ prod https://api.quickmagic.vn
qm credits
qm generate image --prompt "a red apple on a table" --model qimi_3 --wait --out ./out
```

Nếu bước `auth login`/`credits` lỗi (không mở được OAuth discovery, 401 liên tục...) →
nhiều khả năng do bước 0 (backend prod) chưa deploy đúng — quay lại kiểm tra trước khi
báo cho user khác dùng.

## 4. Sau khi publish (tuỳ chọn)

- Gắn GitHub Topics cho repo: `cli`, `ai`, `oauth`, `mcp`, `claude-code`, `agent-skills`.
- Tạo GitHub Release đầu tiên `v1.0.0` (Release notes = tóm tắt tính năng).
- Cập nhật version sau này theo semver (`1.0.1`/`1.1.0`...) rồi `npm publish` lại — **không**
  publish trùng version cũ (npm registry chặn ghi đè).

## 5. Nếu publish nhầm / cần gỡ

- Trong 72 giờ đầu kể từ lúc publish: `npm unpublish quickmagic-cli --force` (xoá hẳn —
  npm chỉ cho phép trong khung 72h và khuyến cáo hạn chế dùng).
- Sau 72 giờ hoặc muốn gỡ nhẹ nhàng hơn (giữ lịch sử, chỉ cảnh báo người cài):
  `npm deprecate quickmagic-cli@1.0.0 "lý do gỡ"`.

## Checklist trước khi bấm publish

- [ ] Backend prod đã deploy code mới nhất (mục 0) — đã tự test CLI trỏ prod thành công
- [ ] `npm pack --dry-run` chỉ chứa file sạch (không secret, không `out/`, không `node_modules/`)
- [ ] `npm view quickmagic-cli` vẫn 404 ngay trước lúc publish (chưa bị ai chiếm)
- [ ] README hiển thị đúng trên GitHub (badge/link không vỡ) sau khi push
- [ ] `git remote -v` trỏ đúng repo GitHub mong muốn trước khi `git push`
