---
name: quickmagic-edit-image
description: >-
  Restore, beauty-retouch, muscle-enhance, or color-boost a single existing
  image via `qm edit`. Use for enhancing an existing photo, not generating a new
  one. For enlarging / sharpening (2k/4k/8k) use the `quickmagic-upscale` skill
  (`qm upscale`) instead. Triggers: "phục hồi ảnh cũ", "làm đẹp da trong ảnh",
  "chỉnh màu ảnh", "restore old photo", "retouch skin".
---

# quickmagic-edit-image — Photo Restore / Retouch

> Phóng to & làm nét ảnh đã tách sang skill `quickmagic-upscale` (`qm upscale`).

Wraps `qm edit <image>`. Edits **one existing image** in place — restoring
damage, upscaling resolution, beauty retouch, muscle enhancement, or color
grading. Not for generating a new image from a text prompt (use
`quickmagic-generate` for that).

## Command

```
qm edit <image> --tool <t> [--model qimi_2.5|qimi_3] [--style <s...>] [--crid <id>]
```

| Flag | Notes |
|---|---|
| `<image>` **required** (positional) | URL or local file path |
| `--tool <t>` **required** | one of `restore` \| `beauty` \| `muscle` \| `color_boost` |
| `--model` | `qimi_2.5` or `qimi_3` (default `qimi_3`) |
| `--style <s...>` | **required when `--tool beauty`** — up to 3 style keywords, repeatable flag |
| `--crid <id>` | idempotency key |

Map the user's request to a tool: "ảnh cũ/rách/mờ" → `restore`; "làm đẹp da/mặt"
→ `beauty` (ask for up to 3 style keywords); "cơ bắp săn chắc hơn" → `muscle`;
"màu sắc rực rỡ hơn" → `color_boost`. "Phóng to / nét hơn / 4K / 8K" KHÔNG thuộc
lệnh này — dùng skill `quickmagic-upscale` (`qm upscale`).

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
Missing `--style` on `beauty` → plain `Lỗi: <message>`; add the flag and retry.
`tool_moved` → tool `upscale` đã dời sang `qm upscale` (skill `quickmagic-upscale`). Full reference:
`quickmagic-account` skill.

## Example

```bash
qm edit ./old-photo.jpg --tool restore --model qimi_3
qm edit ./selfie.jpg --tool beauty --style smooth-skin soft-light
qm jobs wait edt_3 --out ./out
```
