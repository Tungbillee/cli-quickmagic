---
name: quickmagic-generate
description: >-
  Generate AI images or videos from a text prompt and/or reference photos via
  the Quick Magic CLI (`qm generate image` / `qm generate video`). Lists
  models with pricing, quotes the credit cost, confirms with the user before
  spending, and surfaces the Qimi free-image window. Triggers: "generate an
  image", "create a video", "tạo ảnh AI", "tạo video quảng cáo", "vẽ ảnh bằng
  AI", "render video từ ảnh".
---

# quickmagic-generate — AI Image & Video Generation

Wraps `qm generate image` and `qm generate video`. Use whenever the user wants to
**create** new image(s) or a video from a prompt and/or reference images/photos.
For editing an *existing* image see `quickmagic-edit-image`; for product-specific
studio photos see `quickmagic-product-photoshoot`.

## Before anything: auth + balance

1. `qm auth status` — if it prints `Chưa đăng nhập...` (exit 1), tell the user to
   run `qm auth login` first and stop.
2. `qm credits` — read `Số dư`, `Tạm giữ`, `Gói`. If the output includes
   `Qimi miễn phí: còn N ngày (chế độ: ...)`, the account has an active **Qimi
   free-image window** (`qimi_3`/`qimi_2.5` models):
   - Mode **"Miễn phí — 1 ảnh/lần"** → generating with `qimi_3`/`qimi_2.5` and
     `--n 1` is free; proactively tell the user: "Qimi 3/2.5 đang MIỄN PHÍ (còn N
     ngày, 1 ảnh/lần) — muốn tạo nhiều ảnh song song (`--n` > 1) hoặc dùng model
     khác sẽ tốn credit."
   - Mode **"Nhanh — trả credit, chạy song song"** → the benefit is active but this
     account pays credits for parallel speed; say so plainly.

## Pick the right model

`qm models list --type image` or `qm models list --type video` → table
`KEY | LABEL | CREDIT` (+ `IMAGES` column for video, showing max reference images
per mode, e.g. `ref 9 · frames 2`; a `*` after a number means that mode **rejects
real photos of real people** — pick a different model if the user's refs contain
people, e.g. `gemini-omni` / a `seedance 1.x` key / `wan-2-7`).

- This table doesn't print quality tiers — image quality levels are commonly
  `1K`/`2K`/`4K`, priced differently per level. If `--quality` matters, mention the
  level naming and let the server validate, or omit the flag for the model default.
- Match model to intent: photorealistic vs stylized, image-to-image (needs `--ref`)
  vs text-only, required aspect ratio, required video duration/resolution.

## Quote, then confirm (mandatory before spending credits)

Compute an estimate: `credit (from models list) × --n` for images, or the video
model's listed `credit` (base duration/resolution — actual price can vary by
`--duration`/`--resolution`, shown precisely only after submission via
`credits_held`). Present it to the user, e.g.:

> "Model qimi_3: 10cr/ảnh × 4 ảnh = 40cr. Số dư hiện tại: 120cr. Xác nhận tạo?"

Do not run `generate image`/`generate video` until the user confirms — submitting
holds credit immediately.

## Commands

| Command | Required flags | Key optional flags |
|---|---|---|
| `qm generate image` | `--prompt <p>` | `--model <m>` (default `qimi_3`), `--quality <q>`, `--aspect-ratio <r>`, `--n <n>` (default 1), `--ref <r...>` (repeatable — URL or local file path), `--wait`, `--out <dir>` |
| `qm generate video` | `--prompt <p>`, `--model <m>` | `--duration <d>`, `--resolution <r>`, `--aspect-ratio <r>`, `--image <i...>` (repeatable), `--mode reference\|frames`, `--wait`, `--out <dir>` |

- `--ref` / `--image` accept a URL (kept as-is) or a local file path — files are
  UPLOADED automatically to Quick Magic storage (presigned, full original quality)
  and the resulting file_url is used; tiny images ≤64KB are inlined. URLs from
  `qm scrape <url>` / `qm import <url>` also work directly.
- `--mode frames` caps at 2 images (first/last frame); `--mode reference` allows
  more (see the `IMAGES` column). A wrong count is rejected server-side.

## Run + wait for results

- Add `--wait --out <dir>` to the generate command itself to poll and
  auto-download in one step (polls every 2.5s internally).
- Or run without `--wait`, note the printed job id(s)
  (`Đã tạo N job ảnh: img_12, img_13` / `Đã tạo job video: vid_7`), then separately:
  `qm jobs wait img_12 --out ./out`.
- Batch requests (`--n` > 1, or several video jobs): the platform runs several jobs
  in parallel automatically per the account's plan tier; anything beyond that
  queues server-side — no manual throttling needed, just submit and `jobs wait`.

## Report the result

Always end with: the final URL(s) (downloaded file path if `--out` was used,
otherwise the `result_url` field from `qm jobs get <id>`) **and** the credit info
already printed after submission (`Credit tạm giữ: X · Số dư: Y`).

## Errors

- `Lỗi: Không đủ credit: cần Xcr, hiện có Ycr, thiếu Zcr. Vui lòng nạp thêm để
  tiếp tục.` → tell the user exactly how many credits (Z) are missing and suggest
  topping up at https://quickmagic.vn/pricing (or via the Quick Magic app).
- `Lỗi: Tài khoản đang âm N credit...` → balance is negative, must top up before
  any new job.
- `[id] job lỗi: failed` (or `stalled`) after `jobs wait` → relay the job's
  `error` field from `qm jobs get <id>`; a `stalled` status past ~15 minutes
  queued means the queue is backed up — suggest retrying later.
- Full error-code reference and job-status semantics: `quickmagic-account` skill.

## Examples

```bash
qm auth status
qm credits
qm models list --type image
qm generate image --prompt "a red sneaker on white background" --model qimi_3 --n 4 --aspect-ratio 1:1 --wait --out ./out

qm models list --type video
qm generate video --prompt "product slowly rotating" --model grok-imagine --duration 8 --resolution 720p --image ./product.jpg --wait --out ./out

qm jobs get img_12
```
