---
name: quickmagic-cutout
description: >-
  Create a transparent-background PNG cutout of a product/subject, or
  reinterpret a product photo into a new scene, via `qm cutout` (operations:
  generate, from_ref, remix_describe). Triggers: "remove background", "tách
  nền ảnh", "xoá phông sản phẩm", "ảnh PNG trong suốt", "product cutout", "đổi
  bối cảnh ảnh sản phẩm".
---

# quickmagic-cutout — Transparent Cutout / Scene Remix

Wraps `qm cutout`. Three operations — pick the right one:

| Operation | What it does | Needs |
|---|---|---|
| `from_ref` (default) | Keep the subject from 1-5 reference images, isolate it on a **transparent background** | `--ref` (1-5) |
| `generate` | Pure text-to-image, no reference | `--prompt` (required) |
| `remix_describe` | Freely reinterpret **only the first** reference image per your prompt (+3 credit vision fee); background stays only if `--no-transparent-bg` | `--ref` (uses only `--ref[0]`), `--prompt` optional |

## Command

```
qm cutout [--operation generate|from_ref|remix_describe] [--ref <r...>] [--prompt <p>] [--model <m>] [--aspect-ratio <r>] [--quality <q>] [--n <n>] [--no-transparent-bg] [--crid <id>]
```

| Flag | Notes |
|---|---|
| `--operation` | default `from_ref` |
| `--ref <r...>` | URL or local file, repeatable, max 5; required for `from_ref`/`remix_describe` |
| `--prompt <p>` | required when `--operation generate`; optional extra instruction otherwise (max 4000 chars) |
| `--model <m>` | default `nano-banana-2` — recommended for accurate transparent backgrounds; check `qm models list --type image` for alternatives/price |
| `--n <n>` | number of images, 1-6, default 1 |
| `--no-transparent-bg` | only meaningful with `remix_describe` — keeps the original scene instead of cutting it out |

## Before running

1. `qm auth status` → not logged in → `qm auth login`.
2. If the user hasn't supplied an image yet: `qm scrape <url>` or `qm import
   <url>` can fetch one (free), or `qm assets products` for an existing library
   item's image URL.
3. `qm models list --type image` for the `--model`'s credit price.

## Quote, then confirm

Estimated cost = model credit price × `--n`. State it and get confirmation
before running (this holds credit immediately), e.g. "nano-banana-2, 3cr/ảnh ×
2 ảnh = 6cr, số dư Ycr — xác nhận?".

## Run + track

No `--wait` flag. The command prints raw JSON plus a hint:
`→ Theo dõi: quickmagic jobs get cut_<batch>`. This job type returns an
**array of images**, so `qm jobs wait cut_... --out ./out` will poll status
correctly but **won't auto-download**. Once `completed`, run
`qm jobs get cut_...` and read `images[]` (`{status, result_url, operation}`) —
report each `result_url`.

## Errors

`Không đủ credit: ...` → state the shortfall + https://quickmagic.vn/pricing.
Missing `--prompt` on `generate`, or missing `--ref` on `from_ref`/
`remix_describe`, surfaces as a plain `Lỗi: <message>` — fix the flag and
retry. Full reference: `quickmagic-account` skill.

## Example

```bash
qm cutout --operation from_ref --ref ./product-photo.jpg --model nano-banana-2 --n 2
qm jobs wait cut_1737000000abc --out ./out
qm jobs get cut_1737000000abc
```
