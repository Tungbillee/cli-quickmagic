---
name: quickmagic-upscale
description: >-
  Upscale (sharpen + enlarge) one or more existing images to 2K/4K/8K, or
  denoise/sharpen existing videos, via `qm upscale`. Use when the user wants a
  sharper/higher-resolution version of an existing photo or video — not for
  generating new media, and not for restore/beauty/muscle/color_boost (use
  `quickmagic-edit-image` for those). Triggers: "upscale ảnh lên 4k/8k",
  "phóng to ảnh nét hơn", "nâng độ phân giải ảnh", "upscale image to 4k",
  "sharpen this photo", "upscale video", "làm nét video", "video mờ quá làm
  nét lại", "tăng fps video".
---

# quickmagic-upscale — Image (2K/4K/8K) + Video Upscale

Wraps `qm upscale <image...>`. Takes **one or more existing images or
videos** and returns a sharper, higher-resolution (or higher-frame-rate)
version of each — one credit hold and one job per file. Not for restoring
damage, beauty retouch, muscle enhancement, or color grading
(`quickmagic-edit-image` handles those tools), and not for generating new
media from a text prompt (`quickmagic-generate`).

## Command

```
qm upscale <file...> [--model <m>] [--resolution <r>] [--video] [--crid <id>]
```

| Flag | Notes |
|---|---|
| `<file...>` **required** (positional, 1+) | URL(s) or local file path(s) — repeatable, one job submitted per file |
| `--model <m>` | Image: `crisp`\|`standard`\|`seedvr2`\|`ultra`. Video: `standard`\|`pro`\|`seedvr2`\|`fps`. Default `standard` (valid for both) |
| `--resolution <r>` | Image: `2k`\|`4k`\|`8k`, default `4k`. Video: `720p`\|`1080p`\|`2k`\|`4k`, **no CLI default** — omit it and the server picks `1080p` (do NOT pass `4k` "to be safe", it is the most expensive video tier). **Ignored by image `--model crisp`** and **video `--model fps`** (no resolution option); video `--model pro` does not accept `720p` |
| `--video` | Force every file in this command to be treated as **video** — only needed when a URL hides its extension (e.g. a signed URL); local paths and URLs ending in `.mp4`/`.mov`/`.webm` are auto-detected, no flag needed |
| `--crid <id>` | idempotency key; the CLI appends `-0`, `-1`, ... per file so retrying the exact same multi-file command is safe |

Image model choice (ask the user if unclear, or default to `standard`):

| Model | Best for | Notes |
|---|---|---|
| `crisp` | quick sharpen, fixed output size | cheapest; does **not** accept `--resolution` |
| `standard` | general 2K/4K/8K upscale | default |
| `seedvr2` | best detail retention on faces/text | pricier than `standard` |
| `ultra` | highest quality, large enlargements | most expensive — confirm cost before running |

Video model choice (ask the user if unclear, or default to `standard`):

| Model | Resolutions | Best for | Notes |
|---|---|---|---|
| `standard` | 720p/1080p/2k/4k | general video upscale | default; wait ≈10× the clip length |
| `pro` | 1080p/2k/4k (no 720p) | highest-fidelity tier | **slowest**, wait ≈25-30× the clip length |
| `seedvr2` | 720p/1080p/2k/4k | best detail retention | wait ≈6-27× the clip length (higher resolutions are slower) |
| `fps` | none (ignores `--resolution`) | double the frame rate | **fastest**, wait ≈2-3× the clip length |

Video caps: **300MB / 10 minutes** input. Billing is per second of input,
rounded up to the next whole second; if that is still below the model
minimum (`standard`/`seedvr2`: 3s, `pro`/`fps`: 1s) it bills at the minimum
instead — e.g. a 2s clip on `standard` bills as 3s (30 credits, not 20).

## Before running

1. `qm auth status` → not logged in → `qm auth login`.
2. `qm models list --type image` does **not** list upscale pricing (it's a
   separate catalog) — quote credit cost from the table below instead.

## Quote, then confirm

**Image** — state the per-image credit cost **× number of images** and get
confirmation before running — submitting holds credit immediately, one hold
per image:

| Model | Credits/image |
|---|---|
| `crisp` | 10 |
| `standard` | 20 |
| `seedvr2` | 20 |
| `ultra` | 116 |

**Video** — credits are **per second of input** (not per file); estimate
from the clip's duration (`ffprobe`, or ask the user): round the seconds up
to the next whole second, floor that at the model's minimum (`standard`/
`seedvr2`: 3s, `pro`/`fps`: 1s), then × the rate below — confirm the result
before running (do not quote a lower number for clips under the minimum):

| Model | 720p | 1080p | 2k | 4k |
|---|---|---|---|---|
| `standard` | 10 | 10 | 20 | 39 |
| `pro` | — (unsupported) | 14 | 28 | 56 |
| `seedvr2` | 39 | 77 | 96 | 116 |
| `fps` | 16 (flat, no resolution) | | | |

## Run + track

No `--wait` flag. The CLI prints one job hint per file
(`→ Theo dõi: quickmagic jobs get ups_5` for images, `vup_5` for videos);
collect every id from the output, then `qm jobs wait <id> --out ./out` for
each — single `result_url` per job, `--out` auto-downloads. Video processing
is slow (see per-model wait multipliers above) — a `processing` status
(including while the finished file is still being saved) is normal, keep
waiting, do not resubmit. Report every final URL + total `credits_charged`.
Result files follow the account plan retention (free plan: 5 days —
download promptly; paid plans: long-term).

## Errors

`Không đủ credit: ...` → state shortfall + https://quickmagic.vn/pricing.
Any other failure prints `Lỗi: <message>` and stops the whole command (a
prior file's job may already be submitted/charged — check with
`qm jobs get ups_<n>` / `qm jobs get vup_<n>` before retrying that one
file). Full reference: `quickmagic-account` skill.

## Example

```bash
qm upscale ./old-photo.jpg --model standard --resolution 4k
qm upscale ./a.jpg ./b.jpg ./c.jpg --model seedvr2 --resolution 8k
qm jobs wait ups_5 --out ./out

qm upscale ./clip.mp4 --model standard --resolution 1080p
qm upscale https://files.quickmagic.cloud/media-tools/clip.mp4 --model fps
qm jobs wait vup_12 --out ./out
```
