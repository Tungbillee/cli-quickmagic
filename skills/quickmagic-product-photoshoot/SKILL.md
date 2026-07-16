---
name: quickmagic-product-photoshoot
description: >-
  Generate studio/marketing product photos (packshots, lifestyle posters,
  infographics, composites) from 1-3 reference images via `qm product`. Use
  for product catalog/ad photography, not for putting a garment on a person.
  Triggers: "product photoshoot", "ảnh sản phẩm studio", "chụp ảnh sản phẩm
  AI", "tạo poster sản phẩm", "packshot", "catalog photo".
---

# quickmagic-product-photoshoot — Product AI

Wraps `qm product` (Product AI batch generation). Use for **studio/marketing
photos of a product** — packshots, lifestyle/poster images, infographics, or
composites — NOT for putting a product/outfit ON a person (that's
`quickmagic-fashion`'s `tryon`).

## Before running

1. `qm auth status` → if not logged in, tell the user to `qm auth login` first.
2. Get a reference image if the user doesn't have one ready:
   - Already saved in the product library → `qm assets products` (free, no
     credit) lists `{id, name, preview_url}`; use the numeric `id` directly as a
     `--refs` value.
   - From a product page URL → `qm scrape <url>` (free) returns a Quick
     Magic-hosted image URL.
   - From a TikTok/Instagram product post → `qm import <url> --media image`
     (free).
   - Otherwise a plain image URL or a local file path both work as `--refs`
     values.
3. `qm models list --type image` for the credit price of the chosen `--model`
   (default `qimi_2.5`).

## Command

```
qm product --refs <r...> [--types <t...>] [--count <n>] [--kol-id <id>] [--instruction <s>] [--model <m>] [--crid <id>]
```

| Flag | Meaning |
|---|---|
| `--refs <r...>` **required** | 1-3 values: numeric `product_id` (from `qm assets products`) OR an image URL/local file |
| `--types <t...>` | one or more of `product` \| `poster` \| `infographic` \| `composite` (default `product`) |
| `--count <n>` | images generated **per type** (1-20, default 4) |
| `--kol-id <id>` | optional avatar/KOL id (from `qm assets kols`) to feature alongside the product |
| `--instruction <s>` | extra free-text art direction (max 2000 chars) |
| `--model <m>` | image model key (default `qimi_2.5`) |
| `--crid <id>` | idempotency key — reuse on retry to avoid double charge |

Map user intent to `--types`: catalog/e-commerce shot → `product`; social/ad
banner → `poster`; spec sheet / feature callouts → `infographic`; multiple items
together → `composite`. Multiple types can be combined in one call.

## Quote, then confirm

Total images = `--count` × number of `--types` values. Estimated cost = that
total × the model's `credit` from `qm models list --type image`. State it, e.g.
"qimi_2.5, 4 ảnh × 2 loại (product+poster) = 8 ảnh × 8cr = 64cr, số dư hiện tại
Ycr — xác nhận tạo?" before running.

## Run + track

`qm product` has **no `--wait` flag** — it prints raw JSON plus a hint line:

```
→ Theo dõi: quickmagic jobs get pai_1737000000_ab12
```

Copy that job id and run `qm jobs wait pai_... --out ./out` — **but note**: this
job type returns an **array of images**, not one `result_url`; `jobs wait --out`
will poll status correctly but will **not auto-download** (the CLI only
auto-downloads when the job view has a single `result_url`). Once status is
`completed`, run `qm jobs get pai_...` and read `images[]` — each entry is
`{status, image_url, image_type}`. Report every `image_url` to the user.

## Errors

- `Không đủ credit: cần Xcr, hiện có Ycr, thiếu Zcr...` → state the shortfall,
  suggest topping up (https://quickmagic.vn/pricing).
- Invalid/missing ref → CLI prints `Lỗi: <message>`; check the `--refs` value is
  a valid id, URL, or existing local file.
- Full error/status reference: `quickmagic-account` skill.

## Example

```bash
qm assets products
qm product --refs 42 --types product poster --count 4 --model qimi_2.5
qm jobs wait pai_1737000000_ab12 --out ./out
qm jobs get pai_1737000000_ab12
```
