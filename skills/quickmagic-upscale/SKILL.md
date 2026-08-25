---
name: quickmagic-upscale
description: >-
  Upscale (sharpen + enlarge) one or more existing images to 2K/4K/8K via
  `qm upscale`. Use when the user wants a sharper/higher-resolution version
  of an existing photo — not for generating a new image, and not for
  restore/beauty/muscle/color_boost (use `quickmagic-edit-image` for those).
  Triggers: "upscale ảnh lên 4k/8k", "phóng to ảnh nét hơn", "nâng độ phân
  giải ảnh", "upscale image to 4k", "sharpen this photo".
---

# quickmagic-upscale — Image Upscale (2K/4K/8K)

Wraps `qm upscale <image...>`. Takes **one or more existing images** and
returns a sharper, higher-resolution version of each — one credit hold and
one job per image. Not for restoring damage, beauty retouch, muscle
enhancement, or color grading (`quickmagic-edit-image` handles those tools),
and not for generating a new image from a text prompt (`quickmagic-generate`).

## Command

```
qm upscale <image...> [--model crisp|standard|seedvr2|ultra] [--resolution 2k|4k|8k] [--crid <id>]
```

| Flag | Notes |
|---|---|
| `<image...>` **required** (positional, 1+) | URL(s) or local file path(s) — repeatable, one job submitted per image |
| `--model <m>` | `crisp` \| `standard` (default) \| `seedvr2` \| `ultra` |
| `--resolution <r>` | `2k` \| `4k` (default) \| `8k` — **ignored by `--model crisp`** (fixed output size, no resolution option) |
| `--crid <id>` | idempotency key; the CLI appends `-0`, `-1`, ... per image so retrying the exact same multi-image command is safe |

Model choice (ask the user if unclear, or default to `standard`):

| Model | Best for | Notes |
|---|---|---|
| `crisp` | quick sharpen, fixed output size | cheapest; does **not** accept `--resolution` |
| `standard` | general 2K/4K/8K upscale | default |
| `seedvr2` | best detail retention on faces/text | pricier than `standard` |
| `ultra` | highest quality, large enlargements | most expensive — confirm cost before running |

## Before running

1. `qm auth status` → not logged in → `qm auth login`.
2. `qm models list --type image` does **not** list upscale pricing (it's a
   separate catalog) — quote credit cost from the table below instead.

## Quote, then confirm

State the per-image credit cost **× number of images** and get confirmation
before running — submitting holds credit immediately, one hold per image:

| Model | Credits/image |
|---|---|
| `crisp` | 10 |
| `standard` | 20 |
| `seedvr2` | 20 |
| `ultra` | 116 |

## Run + track

No `--wait` flag. The CLI prints one job hint per image
(`→ Theo dõi: quickmagic jobs get ups_5`); collect every `ups_<n>` id from
the output, then `qm jobs wait <id> --out ./out` for each — single
`result_url` per job, `--out` auto-downloads. Report every final URL +
total `credits_charged`.

## Errors

`Không đủ credit: ...` → state shortfall + https://quickmagic.vn/pricing.
Any other failure prints `Lỗi: <message>` and stops the whole command (a
prior image's job may already be submitted/charged — check with
`qm jobs get ups_<n>` before retrying that one image). Full reference:
`quickmagic-account` skill.

## Example

```bash
qm upscale ./old-photo.jpg --model standard --resolution 4k
qm upscale ./a.jpg ./b.jpg ./c.jpg --model seedvr2 --resolution 8k
qm jobs wait ups_5 --out ./out
```
