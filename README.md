# quickmagic-cli

[![npm version](https://img.shields.io/npm/v/quickmagic-cli.svg)](https://www.npmjs.com/package/quickmagic-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

**English** — Command-line client for [Quick Magic](https://quickmagic.vn): generate AI
images/videos, product photoshoots, virtual try-on, hook ad videos, auto-subtitles/dubbing
and more, through the Quick Magic REST API. Sign-in is browser-based **OAuth PKCE** — no API
keys to copy around. Requires Node.js **≥ 18** (uses built-in `fetch`/`crypto`/`http`, no
`axios`). Also ships with 9 Claude **Agent Skills** and an **MCP server** integration for
coding agents. Everything below this line is in Vietnamese (tiếng Việt) — quickstart only:

```bash
npm install -g quickmagic-cli    # once published to npm — see "Cài đặt" below for today
qm auth login                    # opens your browser to sign in
qm generate image --prompt "a red apple on a table" --model qimi_3 --wait --out ./out
```

Full command reference, MCP setup, Agent Skills, troubleshooting: keep reading, or run
`qm <command> --help`.

---

## Giới thiệu

CLI tạo ảnh/video AI qua REST API Quick Magic, đăng nhập bằng **OAuth PKCE** (mở trình
duyệt, không cần dán API key).

- Node **>= 18** (dùng `fetch`/`crypto`/`http` built-in — không cần axios).
- Bin: `quickmagic` và alias `qm`.
- REST base: `https://api.quickmagic.vn/public/v1`. Discovery OAuth ở root
  `https://api.quickmagic.vn/.well-known/oauth-authorization-server`.

## Cài đặt

**Cách 1 — npm (sau khi publish):**

```bash
npm install -g quickmagic-cli
```

**Cách 2 — cài từ source (dùng ngay bây giờ):**

```bash
git clone https://github.com/Tungbillee/cli-quickmagic.git
cd cli-quickmagic
npm install
npm install -g .
```

**Cách 3 — dev local (symlink, sửa code chạy luôn):**

```bash
cd cli-quickmagic
npm install
npm link                # tạo lệnh global `quickmagic` / `qm` trỏ về source
```

Gỡ cài đặt: `npm rm -g quickmagic-cli` (Cách 1/2) hoặc `npm unlink -g quickmagic-cli` (Cách 3).

## Bắt đầu nhanh (3 lệnh)

```bash
npm install -g quickmagic-cli
qm auth login
qm generate image --prompt "a red apple on a table" --model qimi_3 --wait --out ./out
```

`qm auth login` mở trình duyệt đăng nhập 1 lần; các lệnh sau tự dùng token đã lưu (tự
refresh khi sắp hết hạn hoặc gặp HTTP 401 — không cần đăng nhập lại).

## Xác thực

```bash
qm auth login                              # mở trình duyệt, đăng nhập, lưu token
qm auth login --api-url https://api.quickmagic.vn   # chỉ định URL gốc khác
qm auth status                             # in email / số dư
qm auth logout                             # xoá credentials
```

Credentials lưu tại `~/.quickmagic/credentials.json` (quyền `600`, thư mục `700`).
Access token tự refresh khi sắp hết hạn hoặc khi gặp HTTP 401 — không cần đăng nhập lại.

## Bảng lệnh đầy đủ

Ghi chú chung trước khi xem bảng:

- Tham số nhận ảnh/video (`--ref`, `--image`, `--garment`, `--character`, `--product`...)
  nhận **URL** (giữ nguyên) hoặc **file local** (tự đọc → `data:image/*;base64,...`). File
  local lớn (> ~8MB) sẽ bị cảnh báo — nên dùng URL vì body giới hạn ~10MB.
- `--crid <id>` (`client_request_id`) dùng cho **idempotency** — truyền cùng giá trị khi
  retry để không bị tạo job / trừ tiền 2 lần.
- Cột **Credit** đánh dấu lệnh có giữ/trừ credit hay không; xem giá chính xác bằng
  `qm models list`, `qm hook presets`, `qm marketing modes` trước khi chạy thật.
- Xem đầy đủ cờ (flags) của từng lệnh: `qm <lệnh> --help` (vd `qm hook video --help`).

### Xác thực & tài khoản

| Lệnh | Mô tả | Credit |
|---|---|---|
| `qm auth login` | Đăng nhập qua trình duyệt (OAuth PKCE) | — |
| `qm auth logout` | Đăng xuất, xoá credentials | — |
| `qm auth status` | Xem email / số dư | — |
| `qm credits` | Số dư / tạm giữ / gói / Qimi free-window | — |
| `qm models list --type image\|video` | Bảng model + giá credit | — |

### Tạo ảnh / video + theo dõi job

| Lệnh | Mô tả | Credit |
|---|---|---|
| `qm generate image` | Tạo ảnh AI (text-to-image, tối đa nhiều ảnh tham chiếu) | Có |
| `qm generate video` | Tạo video AI (text-to-video / ảnh đầu vào) | Có |
| `qm jobs get <id>` | Xem chi tiết 1 job (JSON) | — |
| `qm jobs wait <id> [--out dir]` | Chờ job hoàn tất + tải kết quả | — |

### Sản phẩm / Thời trang

| Lệnh | Mô tả | Credit |
|---|---|---|
| `qm product --refs <r...>` | Ảnh sản phẩm AI (packshot/poster/infographic/composite) | Có |
| `qm fashion --outfit <id...>` | Ảnh thời trang từ outfit đã lưu + KOL | Có |
| `qm tryon --model-image <img>` | Thử đồ ảo (virtual try-on) trên ảnh người cụ thể | Có |

### Ảnh nâng cao

| Lệnh | Mô tả | Credit |
|---|---|---|
| `qm cutout` | Tách nền / PNG trong suốt / remix scene | Có |
| `qm edit <image> --tool <t>` | restore / upscale (2k,4k) / beauty / muscle / color_boost | Có |

### Video quảng cáo / Marketing

| Lệnh | Mô tả | Credit |
|---|---|---|
| `qm hook presets` | Liệt kê preset Hook Studio + giá | — |
| `qm hook video --preset <id>` | Video hài quảng cáo từ ảnh nhân vật + sản phẩm | Có |
| `qm marketing modes` | Liệt kê mode + bảng giá theo duration | — |
| `qm marketing video --mode <id>` | Video marketing (giá theo duration) | Có |
| `qm analyze <video_url>` | Phân tích video quảng cáo đối thủ → kịch bản | Có (15cr) |

### Audio / Video dài

| Lệnh | Mô tả | Credit |
|---|---|---|
| `qm stt <audio_url>` | Chuyển giọng nói → văn bản (+ dịch) | Có |
| `qm subtitle <video_url>` | Thêm phụ đề (+ lồng tiếng, dịch) | Có |
| `qm split <video_url>` | Cắt video dài → clip ngắn | Có |
| `qm motion <video_url> --image <url...>` | Áp chuyển động video vào ảnh (Kling) | Có |
| `qm tts (--text <t>\|--file <path>) --voice <v>` | Chuyển văn bản → giọng nói (5 model qimi_1.5/2.5/3/5/5.5) | Có |
| `qm voices list --model <m>` | Liệt kê giọng theo model + giá (`pricing`) | — |
| `qm voices clone --audio <file\|url> --name <n>` | Nhân bản giọng riêng (dùng cho qimi_5/5.5) | Có |
| `qm voices delete <id>` | Xoá giọng đã clone | — |

### Nhập liệu (miễn phí)

| Lệnh | Mô tả | Credit |
|---|---|---|
| `qm scrape <url>` | Quét ảnh + tên sản phẩm từ link trang | — |
| `qm import <url>` | Nhập ảnh/video từ link TikTok/Instagram | — |
| `qm assets <kind>` | Liệt kê tài sản đã lưu: `products`\|`outfits`\|`kols` | — |

## Tạo ảnh

```bash
qm generate image --prompt "a red apple on a table" --model qimi_3
qm generate image --prompt "a cat" --model qimi_3 --n 4 --quality high --aspect-ratio 1:1
qm generate image --prompt "same style" --ref https://x.com/a.png --ref ./local.jpg
qm generate image --prompt "a dog" --model qimi_3 --wait --out ./out   # chờ + tải file
```

- `--ref` nhận **URL** (giữ nguyên) hoặc **file local** (đọc thành `data:image/*;base64,...`). Lặp nhiều lần để gửi nhiều ảnh.
- Ảnh local lớn (> ~8MB) sẽ bị cảnh báo — nên dùng URL vì body giới hạn ~10MB.

## Tạo video

```bash
qm generate video --prompt "a waving flag" --model grok-imagine
qm generate video --prompt "zoom in" --model <m> --duration 8 --resolution 720p --image ./first.jpg
qm generate video --prompt "..." --model grok-imagine --wait --out ./out
```

- `--image` cũng nhận URL hoặc file local (như `--ref`).
- `--mode reference|frames` — `reference` (nhiều ảnh tham chiếu) hoặc `frames` (khung
  đầu/cuối, tối đa 2). Model họ Seedance 2.x (`seedance-2-0`, `-fast`, `-mini`) giờ **tự động
  chấp nhận ảnh người thật** ở mọi `--mode` — xem mục "Ảnh người thật" ngay dưới.

### Ảnh người thật (Seedance 2.x)

Model họ Seedance 2.x không còn chặn cứng ảnh có người thật: hệ thống tự kiểm tra + chuẩn bị
ảnh trước khi render, **có thể mất thêm ~1–3 phút** ở lần đầu dùng 1 ảnh cụ thể. Trong lúc đó
`qm jobs wait`/`--wait` in dòng `đang chuẩn bị ảnh có người thật (tối đa ~10 phút) — đừng tạo
job mới…` — **đừng bấm Ctrl+C rồi chạy lại lệnh**, cứ để CLI tự chờ tiếp (script/agent gọi
`jobs get`/`wait_for_job` cũng áp dụng y hệt — xem `docs/mcp-integration-guide.md` phía repo
backend). Ảnh bị bộ lọc nội dung của model từ chối (bản quyền/chính sách; khi bật kiểm tra sớm:
người nổi tiếng/nhân vật công chúng, trẻ em, nội dung nhạy cảm) → job `failed` kèm message rõ lý do
+ 1 `error_code` trong bảng dưới (credit hoàn), CLI tự in gợi ý xử lý:

| `error_code` | Ý nghĩa | Gợi ý |
|---|---|---|
| `PORTRAIT_PUBLIC_FIGURE` | Ảnh có người nổi tiếng/nhân vật công chúng | Dùng ảnh người thường |
| `PORTRAIT_MINOR` | Ảnh có trẻ em | Dùng ảnh người lớn |
| `PORTRAIT_NSFW` | Ảnh vi phạm nội dung nhạy cảm | Dùng ảnh khác |
| `PORTRAIT_GEMINI_UNAVAILABLE` | Chưa kiểm được ảnh (hệ thống bận) | Thử lại sau vài phút |
| `PORTRAIT_ASSET_FAILED` | Ảnh không được chấp nhận (mờ/nhiều người/định dạng lạ) | Thử ảnh khác |
| `PORTRAIT_ASSET_REJECTED` | Ảnh vẫn bị bộ lọc nội dung từ chối sau khi xử lý (người nổi tiếng/trẻ em/nhạy cảm/bản quyền) | Dùng ảnh khác |
| `PORTRAIT_TIMEOUT` | Chuẩn bị ảnh quá lâu (>10 phút) | Thử lại |
| `PORTRAIT_QUOTA_FULL` | Hệ thống đang bận (đầy quota tạm) | Thử lại sau vài phút |
| `PORTRAIT_IMAGE_HOST` | Ảnh không thuộc host Quick Magic | Dùng `--image <file local>` (CLI tự upload) thay URL ngoài |
| `PORTRAIT_IMAGE_FETCH_FAILED` | Không tải được ảnh | Thử lại |
| `PORTRAIT_PROVIDER_ERROR` | Hệ thống đang bận (lỗi tạm thời) | Thử lại sau ít phút |
| `PORTRAIT_PROVIDER_FAILED` | Ảnh bị từ chối theo chính sách nội dung (người nổi tiếng/trẻ em/nhạy cảm/bản quyền) | Dùng ảnh khác |
| `PORTRAIT_COPYRIGHT` | Ảnh bị từ chối vì bản quyền/quyền hình ảnh (người nổi tiếng, nhân vật/tác phẩm/thương hiệu được bảo hộ) | Dùng ảnh khác |
| `PORTRAIT_DISABLED` | Tính năng ảnh người thật đang tắt | Đổi `--model gemini-omni` |
| `PORTRAIT_TOO_MANY_IMAGES` | Vượt số ảnh người thật cho phép của model | Bớt `--image` |
| `PORTRAIT_VIDEO_REF_UNSUPPORTED` | Video tham chiếu có người thật chưa hỗ trợ | Dùng `--image` thay `--video-ref`, hoặc đổi model |
| `REAL_PERSON_BLOCKED` | (mã cũ) Model không nhận ảnh người thật | Đổi `--model gemini-omni` |

## Job

```bash
qm jobs get img_12               # in JSON chi tiết job
qm jobs wait vid_7 --out ./out   # poll mỗi 2.5s tới khi xong, tải kết quả về ./out
```

## Model & Credit

```bash
qm models list --type image      # bảng key | label | credit
qm models list --type video
qm credits                       # số dư / tạm giữ / gói
```

## Ví dụ nhanh — các tính năng khác

```bash
# Ảnh sản phẩm AI (product_id trong tủ đồ, hoặc URL/base64 — tối đa 3 ref)
qm product --refs 42 --types product poster --count 2

# Ảnh thời trang từ outfit đã lưu
qm fashion --outfit 7 12 --mode kol_outfit --kol-id 3

# Thử đồ ảo trên ảnh người cụ thể
qm tryon --model-image ./me.jpg --garment ./ao.jpg --type full

# Tách nền / tạo PNG trong suốt từ ảnh tham chiếu
qm cutout --operation from_ref --ref ./product.jpg --model nano-banana-2

# Video hài quảng cáo — xem preset + giá trước khi chạy
qm hook presets
qm hook video --preset <id> --character ./face.jpg --product ./product.jpg --speech-lang vi

# Phụ đề tự động (+ dịch), cắt video dài thành clip ngắn
qm subtitle https://cdn.example.com/video.mp4 --translate en
qm split https://www.tiktok.com/@user/video/123 --mode auto

# Giọng nói → văn bản, áp chuyển động video vào ảnh
qm stt https://cdn.example.com/audio.mp3 --translate vi
qm motion https://cdn.example.com/dance.mp4 --image ./photo.jpg

# Đọc văn bản thành giọng nói — xem giá + chọn giọng trước khi chạy
qm voices list --model qimi_1.5 --language "Tiếng Việt"
qm tts --text "Xin chào Quick Magic" --voice <voice_id> --model qimi_3 --wait --out ./out
qm voices clone --audio ./sample.wav --name "Giọng của tôi" --wait

# Video marketing theo mode + phân tích video đối thủ → kịch bản
qm marketing modes
qm marketing video --mode 3 --product-id 42 --duration 10

# Nhập liệu — không tốn credit
qm scrape https://shop.example.com/product/123
qm import https://www.tiktok.com/@user/video/123 --media image
qm assets products --limit 20
qm analyze https://cdn.example.com/ad.mp4 --product-id 42
```

## Biến môi trường

| Biến | Ý nghĩa |
|---|---|
| `QUICKMAGIC_URL` | Ghi đè URL gốc API (mặc định `https://api.quickmagic.vn`). |
| `QUICKMAGIC_TOKEN` | **CI headless** — access token. Có biến này thì bỏ qua bước mở trình duyệt. |
| `QUICKMAGIC_REFRESH_TOKEN` | **CI headless** — refresh token (kèm access token). |

Khi chạy bằng env token, CLI **chỉ đọc** token từ env, **không** ghi xuống `~/.quickmagic/credentials.json`.

```bash
# Ví dụ CI
export QUICKMAGIC_TOKEN="<access_token>"
export QUICKMAGIC_REFRESH_TOKEN="<refresh_token>"
qm credits          # chạy không cần browser
```

## Mã thoát (exit code)

- `0` — thành công.
- `1` — lỗi (chưa đăng nhập, job thất bại, HTTP lỗi, ...). Thân thiện CI.

## Agent Skills

CLI này đi kèm 9 **Agent Skills** (`skills/quickmagic-*/SKILL.md`) để coding agent
(Claude Code...) dùng CLI trực tiếp — báo giá + xin xác nhận trước khi tốn credit,
tự `jobs wait` thay vì poll tay, chủ động báo Qimi free-window. Danh sách đầy đủ và quy ước
chung: xem `skills/README.md`.

**Yêu cầu:** cài CLI trước (xem mục Cài đặt) + `qm auth login` một lần trên máy.

Cách 1 — `npx skills` (nếu dùng công cụ [`skills`](https://www.npmjs.com/package/skills) để
quản lý Agent Skills từ GitHub):

```bash
npx skills add Tungbillee/cli-quickmagic --skills quickmagic-account,quickmagic-generate,quickmagic-product-photoshoot,quickmagic-fashion,quickmagic-cutout,quickmagic-hook-video,quickmagic-edit-image,quickmagic-subtitle-split,quickmagic-tts
```

Cách 2 — copy thủ công vào thư mục skills của Claude Code:

```bash
cp -r skills/quickmagic-* .claude/skills/        # project (chỉ áp dụng cho project này)
cp -r skills/quickmagic-* ~/.claude/skills/      # user (mọi project trên máy)
```

## MCP (Model Context Protocol)

Quick Magic cũng có MCP server dùng **chung tài khoản/ví credit** — cho phép Claude Code
(và các MCP client khác) gọi thẳng `generate_image`, `generate_video`, `get_job`,
`wait_for_job`, `list_models`, `get_credit_balance`, `list_voices`, `text_to_speech`,
`create_voice_clone`, `delete_voice_clone`... mà không cần qua CLI. Xác thực OAuth 2.1 qua
trình duyệt, không cần API key.

- MCP endpoint: `https://api.quickmagic.vn/mcp`

**Claude Code:**

```bash
claude mcp add --transport http quickmagic https://api.quickmagic.vn/mcp
```

Lần đầu dùng sẽ mở trình duyệt → đăng nhập Quick Magic → **Cho phép**. Kiểm tra:
`claude mcp list` hoặc gõ `/mcp` trong phiên Claude Code.

**Cursor** — thêm vào `.cursor/mcp.json`:

```json
{ "mcpServers": { "quickmagic": { "url": "https://api.quickmagic.vn/mcp" } } }
```

**claude.ai (web connector):** Settings → Connectors → Add custom connector → dán URL
`https://api.quickmagic.vn/mcp` → Connect → đăng nhập Quick Magic.

CLI và MCP dùng chung tài khoản: đăng nhập 1 bên không tự đăng nhập bên kia (mỗi bên lưu
token riêng), nhưng số dư credit/lịch sử job là chung.

## Bảo mật

- PKCE S256 (không lưu client secret trên máy). `state` chống CSRF ở callback.
- Loopback chỉ nghe `127.0.0.1` (không `0.0.0.0`), `redirect_uri` gắn port cụ thể của phiên login.
- `credentials.json` quyền `600`, ghi kiểu temp→rename (atomic, không hỏng JSON).
- Refresh bọc lockfile `~/.quickmagic/refresh.lock` chống 2 tiến trình refresh đồng thời.
- Không in access/refresh token ra stdout/log.

## Khắc phục sự cố

| Vấn đề | Xử lý |
|---|---|
| `Chưa đăng nhập. Chạy: quickmagic auth login` | Chạy `qm auth login`. |
| Trình duyệt không tự mở khi login | Dán URL được in ra terminal vào trình duyệt bất kỳ. |
| Đăng nhập quá 2 phút (timeout) | Chạy lại `qm auth login`. |
| Lỗi HTTP 401 lặp lại dù đã đăng nhập | Token bị thu hồi/hết hạn refresh — `qm auth logout` rồi `qm auth login` lại. |
| `Không đủ credit: ... thiếu Zcr` | Nạp thêm tại https://quickmagic.vn/pricing. |
| Cảnh báo file > 8MB khi dùng `--ref`/`--image` | Body giới hạn ~10MB — ưu tiên dùng URL public thay vì file local. |
| Muốn trỏ CLI vào domain/môi trường khác | Cờ `--api-url <url>` (khi login) hoặc biến môi trường `QUICKMAGIC_URL`. |
| Máy CI/server không có trình duyệt | Đặt `QUICKMAGIC_TOKEN` (+ `QUICKMAGIC_REFRESH_TOKEN`) — xem mục Biến môi trường. |
| Cài `-g` xong gõ `qm`/`quickmagic` báo "command not found" | Kiểm tra `npm config get prefix`, thêm `<prefix>/bin` vào `PATH`. |

## Giấy phép

[MIT](./LICENSE) © Quick Magic. Issue/góp ý:
https://github.com/Tungbillee/cli-quickmagic/issues.
