---
name: quickmagic-subtitle-split
description: >-
  Add auto-subtitles (with optional translation/dubbing) via `qm subtitle`,
  or cut a long video into short highlight clips via `qm split`. Both take a
  direct video URL or a TikTok/Instagram post link (not YouTube). Triggers:
  "thêm phụ đề tự động", "lồng tiếng video", "dịch phụ đề", "cắt video dài
  thành clip ngắn", "auto subtitle", "split video into shorts".
---

# quickmagic-subtitle-split — Auto-Subtitle & Video Splitting

Wraps two related video post-processing commands:

| Command | What it does |
|---|---|
| `qm subtitle <video_url>` | Adds subtitles to a video, with optional translation and/or voice dubbing |
| `qm split <video_url>` | Cuts one long video into several short highlight clips with auto-generated titles |

Both need a **direct video file URL, or a TikTok/Instagram POST link** — **not a
YouTube link, not a profile page**. If the user only has a YouTube link, tell
them it's not supported by this command.

## Commands

```
qm subtitle <video_url> [--dub] [--translate <lang>] [--crid <id>]
qm split <video_url> [--mode auto|specific] [--title-lang <l>] [--translate <lang>] [--crid <id>]
```

| Flag | Notes |
|---|---|
| `--dub` (subtitle only) | enable voice dubbing, not just text subtitles |
| `--translate <lang>` | translate subtitles / clip titles to this language |
| `--mode` (split only) | `auto` (default, auto-detected highlights) or `specific` |
| `--title-lang` (split only) | language for generated clip titles |

## Before running

1. `qm auth status` → not logged in → `qm auth login`.
2. If the user only gave a TikTok/Instagram link and the raw file is needed for
   another step first, `qm import <url> --media video` (free) re-hosts it on
   Quick Magic.

## Pricing — no upfront quote is possible

Unlike other features, there is **no command to preview the credit price**
before submitting — both are billed **by the video's duration**, which the
server only knows after it downloads/probes the video. Do not invent a number.
Instead:

1. Tell the user plainly: "Phí tính theo thời lượng video, chỉ biết chính xác
   sau khi server tải video về — vẫn muốn tiếp tục?"
2. Get a go-ahead to proceed (not a numeric confirmation).
3. Run the command; read `credits_held` and `duration_sec` from the JSON
   response and report those as the actual charge.

## Run + track

Neither command has `--wait`. Copy the job id from the printed hint:

- `qm subtitle` → `→ Theo dõi: quickmagic jobs get sub_4` →
  `qm jobs wait sub_4 --out ./out` (single `result_url`, auto-downloads).
- `qm split` → `→ Theo dõi: quickmagic jobs get spl_8` →
  `qm jobs wait spl_8 --out ./out` polls status but **won't auto-download**
  (result is a `clips[]` array, not one `result_url`). Once `completed`, run
  `qm jobs get spl_8` and read `clips[]`
  (`{title, url, thumbnail_url, start_time, end_time, status, social_content}`)
  — report every clip's `url` + `title`.

## Errors

`Không đủ credit: ...` → state shortfall + https://quickmagic.vn/pricing. A
YouTube link or an unreachable URL surfaces as a plain `Lỗi: <message>` — ask
the user for a direct file URL or a TikTok/Instagram post link instead. Full
reference: `quickmagic-account` skill.

## Example

```bash
qm subtitle https://cdn.example.com/video.mp4 --translate en
qm jobs wait sub_4 --out ./out

qm split https://www.tiktok.com/@user/video/123456 --mode auto --title-lang Vietnamese
qm jobs wait spl_8
qm jobs get spl_8
```
