---
name: quickmagic-account
description: >-
  Foundation skill for the Quick Magic CLI: login/logout/status (`qm auth`),
  credit balance + Qimi free-window benefit (`qm credits`), model catalog
  (`qm models list`), and job status/waiting (`qm jobs`). Every other
  quickmagic-* skill depends on this one for auth checks, pricing lookups,
  job-id prefixes, and the common error-code table. Triggers: "đăng nhập
  quickmagic", "kiểm tra số dư credit", "danh sách model AI", "theo dõi
  trạng thái job", "quickmagic login", "check my credits".
---

# quickmagic-account — Auth, Credits, Models, Jobs (Foundation)

Wraps `qm auth`, `qm credits`, `qm models list`, and `qm jobs`. Every `quickmagic-*`
skill relies on this one — read it first if this is your first Quick Magic CLI task
in a session. Bin name: `quickmagic` (alias `qm`).

## Auth

```bash
qm auth login [--api-url <url>]   # opens a browser, OAuth PKCE, saves credentials
qm auth status                    # prints email / balance / plan / api url
qm auth logout                    # clears saved credentials
```

- `qm auth status` prints `Chưa đăng nhập. Chạy: quickmagic auth login` and exits
  **1** when there is no saved (or env) token. Always check auth (run this, or
  attempt the real command and read stderr) before any other quickmagic command in
  a fresh session — if it fails, tell the user to run `qm auth login` and stop.
- Credentials live in `~/.quickmagic/credentials.json`; access tokens auto-refresh
  in the background, no manual re-login needed once logged in.
- CI/headless: set `QUICKMAGIC_TOKEN` (+ optionally `QUICKMAGIC_REFRESH_TOKEN`) env
  vars to skip the browser step entirely; nothing is written to disk in that mode.
- `QUICKMAGIC_URL` overrides the API root (default `https://api.quickmagic.vn`).

## Credits & the Qimi free-image window

```bash
qm credits
```

Prints `Số dư (balance)`, `Tạm giữ (held)`, `Gói (plan)`, and — only when active —
`Qimi miễn phí: còn N ngày (chế độ: ...)`.

- This benefit gives free `qimi_3`/`qimi_2.5` image generations for a limited
  window (Business/Enterprise plans).
- Mode **"Miễn phí — 1 ảnh/lần"**: one image per call is free; requesting more than
  one in parallel (or `--n` > 1) costs credits.
- Mode **"Nhanh — trả credit, chạy song song"**: the account chose speed over the
  free tier — parallel generations always cost credits.
- Any skill that generates `qimi_3`/`qimi_2.5` images should call `qm credits`
  first and proactively surface this to the user before quoting a price.

Note: `qm auth status` also prints a balance line, but only `qm credits` reports
`held` and the Qimi benefit — use `qm credits` for anything pricing-related.

## Browsing models

```bash
qm models list --type image   # columns: KEY | LABEL | CREDIT
qm models list --type video    # columns: KEY | LABEL | CREDIT | IMAGES
```

- `IMAGES` (video only) shows the max reference images per input mode, e.g.
  `ref 9 · frames 2`. A trailing `*` means that mode **rejects photos containing
  real people** for that model — switch models (e.g. `gemini-omni`, a `seedance
  1.x` key, `wan-2-7`) if the user's reference photos have people in them.
  No `*` = people photos are fine. Seedance 2.x currently accepts real-people
  photos (the server prints an ℹ note under the table): the first use of a given
  photo may add ~1–3 min of preparation — `qm jobs wait` handles it, do NOT
  resubmit. If the model's content filter rejects a photo (copyright/policy), the
  job fails with an explicit reason and the credit is refunded — use another photo.
- The table does not print quality tiers or max-ref-image counts for image
  models — image quality levels are commonly `1K`/`2K`/`4K`, priced per level; if
  the exact enum for a model is unknown, omit `--quality` and let the server
  default, or ask the user.
- Always check this before quoting a price in any generate/edit/product/fashion/
  cutout/hook skill — prices vary per model and change over time; never reuse a
  remembered price from a previous session.

## Job status & waiting

```bash
qm jobs get <id>              # prints the full job JSON
qm jobs wait <id> [--out dir] # polls every 2.5s until a terminal status; downloads on success if --out is set
```

Never poll `jobs get` manually in a loop — always use `jobs wait` (or the
generating command's own `--wait` flag, where available).

**Job id prefixes** (dispatch table used by every `qm jobs` call):

| Prefix | Feature | Result shape |
|---|---|---|
| `img_` | `generate image` | single `result_url` |
| `vid_` | `generate video` | single `result_url` + `thumbnail_url` |
| `pai_` | `product` | **array** `images[]` `{status, image_url, image_type}` |
| `fsh_` | `fashion` | **array** `results[]` `{status, url, pose_index}` |
| `vto_` | `tryon` | single `result_url` |
| `edt_` | `edit` | single `result_url` |
| `cut_` | `cutout` | **array** `images[]` `{status, result_url, operation}` |
| `hok_` | `hook video` | single `result_url` + `thumbnail_url` |
| `sub_` | `subtitle` | single `result_url` |
| `spl_` | `split` | **array** `clips[]` `{title, url, thumbnail_url, start_time, end_time, status}` |
| `mkt_` | `marketing video` | single result (no dedicated skill) |
| `mot_` | `motion` | single result (no dedicated skill) |
| `stt_` | `stt` | text result (no dedicated skill) |
| `tts_` | `tts` | single `result_url` (mp3) + `model`/`voice`/`character` — see `quickmagic-tts` |
| `voc_` | `voices clone` | **no** `result_url`: `voice` (name to use with `--voice`), `sample_url`, `is_free` — see `quickmagic-tts` |
| `mus_` | `music create` | single `result_url` (mp3) + `title`/`duration_ms` — see `quickmagic-music` |
| `ups_` | `upscale` (image) | single `result_url` — see `quickmagic-upscale` |
| `vup_` | `upscale` (video, `--video`/auto-detected) | single `result_url` + `duration_sec` — see `quickmagic-upscale` |

**Important caveat**: `jobs wait --out <dir>` only **auto-downloads** for the
single-`result_url` types (`img_`/`vid_`/`vto_`/`edt_`/`hok_`/`sub_`/`tts_`/`mus_`/
`ups_`/`vup_`). For the array types (`pai_`/`fsh_`/`cut_`/`spl_`) and `voc_` (voice
clone — no file, read `voice`/`sample_url` via `qm jobs get`), `--out` still polls
status correctly but downloads nothing — after status is `completed`, call
`qm jobs get <id>` and read the array field yourself, then report each URL to the user.

Statuses: `queued` → `in_progress` → `completed` (success) or `failed` (relay the
job's `error` field). A `queued` status stuck past ~15 minutes is reported as
`stalled` with a hint that the queue may be backed up — suggest retrying later
rather than resubmitting immediately.

## Common errors (any command)

| CLI message (stderr, exit 1) | Meaning | What to do |
|---|---|---|
| `Chưa đăng nhập. Chạy: quickmagic auth login` | no local/env token | tell the user to run `qm auth login` |
| `Không đủ credit: cần Xcr, hiện có Ycr, thiếu Zcr. Vui lòng nạp thêm để tiếp tục.` | `insufficient_credit` (HTTP 402) | state the exact shortfall (Z) and suggest topping up at https://quickmagic.vn/pricing |
| `Tài khoản đang âm N credit. Vui lòng nạp thêm để tiếp tục sử dụng.` | `negative_balance` (HTTP 402) | same — must top up before any new paid job |
| `Bạn đã có N job đang xử lý (giới hạn M job đồng thời cho gói ...)` | `concurrent_limit` (HTTP 429) | wait for an in-flight job to finish (`jobs wait`) before submitting more |
| `Bạn thao tác quá nhanh. Chờ Ns.` | `rate_limited` (HTTP 429) | wait N seconds, then retry |
| any other `Lỗi: <message>` | validation error (bad model/ref/prompt/URL — HTTP 400/413/502) | read the message, fix the offending flag, retry — don't blindly resubmit unchanged |

Exit code is always `1` on any failure, `0` on success — safe to script around.

## Example

```bash
qm auth status || qm auth login
qm credits
qm models list --type image
qm jobs get img_12
qm jobs wait vid_7 --out ./out
```
