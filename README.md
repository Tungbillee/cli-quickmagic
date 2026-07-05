# quickmagic-cli

CLI tạo ảnh/video AI qua REST API Quick Magic, đăng nhập bằng **OAuth PKCE** (mở trình duyệt, không cần dán API key).

- Node **>= 18** (dùng `fetch`/`crypto`/`http` built-in — không cần axios).
- Bin: `quickmagic` và alias `qm`.
- REST base: `https://api.quickmagic.vn/public/v1`. Discovery OAuth ở root `https://api.quickmagic.vn/.well-known/oauth-authorization-server`.

## Cài đặt

```bash
# Cách 1 — cài global từ source
cd cli-quickmagic
npm install
npm install -g .        # hoặc: npm i -g quickmagic-cli (khi đã publish)

# Cách 2 — dev local (symlink)
cd cli-quickmagic
npm install
npm link                # tạo lệnh global `quickmagic` / `qm` trỏ về source
```

Gỡ: `npm unlink -g quickmagic-cli` (nếu dùng `npm link`) hoặc `npm rm -g quickmagic-cli`.

## Xác thực

```bash
qm auth login                              # mở trình duyệt, đăng nhập, lưu token
qm auth login --api-url https://api.quickmagic.vn   # chỉ định URL gốc khác
qm auth status                             # in email / số dư
qm auth logout                             # xoá credentials
```

Credentials lưu tại `~/.quickmagic/credentials.json` (quyền `600`, thư mục `700`).
Access token tự refresh khi sắp hết hạn hoặc khi gặp HTTP 401 — không cần đăng nhập lại.

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

`--image` cũng nhận URL hoặc file local (như `--ref`).

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

## Bảo mật

- PKCE S256 (không lưu client secret trên máy). `state` chống CSRF ở callback.
- Loopback chỉ nghe `127.0.0.1` (không `0.0.0.0`), `redirect_uri` gắn port cụ thể của phiên login.
- `credentials.json` quyền `600`, ghi kiểu temp→rename (atomic, không hỏng JSON).
- Refresh bọc lockfile `~/.quickmagic/refresh.lock` chống 2 tiến trình refresh đồng thời.
- Không in access/refresh token ra stdout/log.
