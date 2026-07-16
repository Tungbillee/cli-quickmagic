---
name: quickmagic-hook-video
description: >-
  Generate a ~10 second comedy ad video from a character photo + a product
  photo using one of 18 Hook Studio presets, via `qm hook presets` (browse +
  price) and `qm hook video` (generate). Triggers: "hook video", "video
  quảng cáo hài hước", "video viral cho sản phẩm", "tạo hook ads", "comedy ad
  video".
---

# quickmagic-hook-video — Hook Studio Comedy Ads

Wraps `qm hook presets` (browse) and `qm hook video` (generate). Produces a short
(~10s) comedy-style ad video: a character reacts/performs around a product,
following one of 18 written presets (each with its own script beats — the actual
prompt text is not exposed, only title/description/beats/preview).

## Step 1 — always browse presets first

```bash
qm hook presets
```

Returns JSON:
- `presets[]` — `{id, title, title_en, tagline, description, beats[], poster_url,
  video_url, sample_character_url, sample_product_url, aspect_default}` for all 18
  presets: `stream`, `breaking-news`, `bear-chase`, `pitch-invasion`,
  `product-run`, `cho-mang-review`, `unbox-bat-ngo`, `san-sale-sap-san`,
  `time-freeze`, `street-interview`, `podcast-clip`, `elevator-pitch`,
  `red-carpet`, `me-chong-review`, `hang-xom-hong`, `tra-da-via-he`,
  `boc-phot-plot-twist`, `di-cho-flex`.
- `credit_cost` — the flat credit price for one hook video at the default
  resolution.
- `aspects` — `["9:16", "16:9"]`.
- `speech_lang_options[]` — `{value, label}` (e.g. `vi`/`Tiếng Việt`,
  `en`/`English`, plus Thai/Indonesian/Chinese/Japanese/Korean/Spanish/
  Portuguese/French/Hindi).
- `resolution_options` — typically `["720p", "1080p"]`.
- `style_options[]` — `{value, label}`, 9 comedic styles (`slapstick`, `chase`,
  `chaos`, `absurd`, `epic_fail`, `heroic`, `surreal`, `panic`, `parody`).
- `format_options[]` — `{value, label}`, 4 formats (`shorts`, `reels`, `ugc`,
  `ad`).

## Step 2 — recommend a preset for the user's product

Read each preset's `title`/`tagline`/`description`/`beats` and match to the
product's category and the vibe the user wants (chaotic/action →
`bear-chase`/`pitch-invasion`/`time-freeze`; sales/livestream energy →
`cho-mang-review`/`san-sale-sap-san`; reveal/twist → `unbox-bat-ngo`; news parody
→ `breaking-news`). Show the user 1-3 candidate presets with their `tagline` +
`poster_url`/`video_url` before picking one.

## Step 3 — quote + confirm

State `credit_cost` from `hook presets` and get explicit confirmation before
running `hook video` (it holds credit immediately).

## Step 4 — generate

```
qm hook video --preset <id> --character <img> --product <img> [--aspect 9:16|16:9] [--speech-lang <l>] [--cta <s>] [--location <img>] [--accessory <img>] [--style <s>] [--format <f>] [--resolution 720p|1080p] [--crid <id>]
```

| Flag | Notes |
|---|---|
| `--preset <id>` **required** | a valid `id` from `hook presets` |
| `--character <img>` **required** | URL or local file — the person featured |
| `--product <img>` **required** | URL or local file — the product |
| `--aspect` | default `9:16` |
| `--speech-lang` | default `vi`; any value from `speech_lang_options`, or free text for another language |
| `--cta` | custom call-to-action line (overrides the preset's default line) |
| `--location` / `--accessory` | optional extra reference photos |
| `--style` / `--format` | single value from `style_options` / `format_options` |
| `--resolution` | `720p` or `1080p` |

If the user doesn't have character/product photos ready, `qm scrape <url>` /
`qm import <url>` / `qm assets products` / `qm assets kols` can source them (all
free).

## Run + track

No `--wait` flag. Copy the job id from the hint
(`→ Theo dõi: quickmagic jobs get hok_7`), then `qm jobs wait hok_7 --out ./out`
— this job type has a single `result_url` (+ `thumbnail_url`), so `--out`
**does** auto-download. Report the final video URL + `credits_charged`.

## Errors

`Không đủ credit: ...` → state shortfall + https://quickmagic.vn/pricing.
Invalid `--preset`, or a missing character/product image, surfaces as a plain
`Lỗi: <message>` — re-check against `hook presets` output. Full reference:
`quickmagic-account` skill.

## Example

```bash
qm hook presets
qm hook video --preset cho-mang-review --character ./host.jpg --product ./drink-can.jpg --speech-lang vi --aspect 9:16
qm jobs wait hok_7 --out ./out
```
