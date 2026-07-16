---
name: quickmagic-edit-image
description: >-
  Restore, upscale (2k/4k), beauty-retouch, muscle-enhance, or color-boost a
  single existing image via `qm edit`. Use for enhancing an existing photo,
  not generating a new one. Triggers: "upscale ảnh lên 4k", "phục hồi ảnh cũ",
  "làm đẹp da trong ảnh", "chỉnh màu ảnh", "restore old photo", "upscale
  image resolution".
---

# quickmagic-edit-image — Photo Restore / Upscale / Retouch

Wraps `qm edit <image>`. Edits **one existing image** in place — restoring
damage, upscaling resolution, beauty retouch, muscle enhancement, or color
grading. Not for generating a new image from a text prompt (use
`quickmagic-generate` for that).

## Command

```
qm edit <image> --tool <t> [--model qimi_2.5|qimi_3] [--upscale-target 2k|4k] [--style <s...>] [--crid <id>]
```

| Flag | Notes |
|---|---|
| `<image>` **required** (positional) | URL or local file path |
| `--tool <t>` **required** | one of `restore` \| `upscale` \| `beauty` \| `muscle` \| `color_boost` |
| `--model` | `qimi_2.5` or `qimi_3` (default `qimi_3`) |
| `--upscale-target` | **required when `--tool upscale`** — `2k` or `4k` |
| `--style <s...>` | **required when `--tool beauty`** — up to 3 style keywords, repeatable flag |
| `--crid <id>` | idempotency key |

Map the user's request to a tool: "ảnh cũ/rách/mờ" → `restore`; "phóng to/nét
hơn/4K" → `upscale` (ask 2k or 4k if not specified); "làm đẹp da/mặt" → `beauty`
(ask for up to 3 style keywords); "cơ bắp săn chắc hơn" → `muscle`; "màu sắc rực
rỡ hơn" → `color_boost`.

## Before running

1. `qm auth status` → not logged in → `qm auth login`.
2. `qm models list --type image` for `qimi_2.5`/`qimi_3` credit price.

## Quote, then confirm

State the model's per-image credit cost and get confirmation before running —
submitting holds credit immediately.

## Run + track

No `--wait` flag. Copy the job id from the hint
(`→ Theo dõi: quickmagic jobs get edt_3`), then `qm jobs wait edt_3 --out ./out`
— single `result_url`, `--out` auto-downloads. Report the final URL +
`credits_charged`.

## Errors

`Không đủ credit: ...` → state shortfall + https://quickmagic.vn/pricing.
Missing `--upscale-target` on `upscale`, or missing `--style` on `beauty` →
plain `Lỗi: <message>`; add the missing flag and retry. Full reference:
`quickmagic-account` skill.

## Example

```bash
qm edit ./old-photo.jpg --tool restore --model qimi_3
qm edit ./portrait.jpg --tool upscale --upscale-target 4k
qm edit ./selfie.jpg --tool beauty --style smooth-skin soft-light
qm jobs wait edt_3 --out ./out
```
