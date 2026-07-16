---
name: quickmagic-fashion
description: >-
  Generate fashion photos via `qm fashion` (outfit lookbook/pose shoots on a
  KOL avatar or outfit-only) and `qm tryon` (virtual try-on of a garment onto
  a specific model/person photo). Picks the right command based on whether
  the user supplies a person photo to dress. Triggers: "virtual try-on", "thử
  đồ ảo", "mặc thử quần áo", "lookbook thời trang", "ảnh KOL mặc outfit", "try
  on this dress".
---

# quickmagic-fashion — Fashion & Virtual Try-On

Two related but distinct commands — pick the right one first:

| User wants... | Command |
|---|---|
| Put a garment on a **specific person photo** they provide (try-on / OOTD / fit-check) | `qm tryon` |
| A styled **lookbook/pose shoot** of outfit(s) from the wardrobe library, optionally on a KOL/avatar | `qm fashion` |

## Before running

1. `qm auth status` → not logged in → tell the user to `qm auth login`.
2. `qm assets outfits` (free) → `{id, name, preview_url}`, gives `outfit_ids` for
   `qm fashion`.
3. `qm assets kols` (free) → gives a `kol_id` for either command (the KOL/avatar
   to wear the outfit).
4. `qm models list --type image` for the credit price of the chosen model.

## `qm tryon` — virtual try-on onto a person photo

```
qm tryon --model-image <img> [--type full|upper] [--model qimi_1.5|qimi_2.5|qimi_3] [--garment <img>] [--upper <img>] [--lower <img>] [--background <img>] [--prompt <p>] [--crid <id>]
```

- `--model-image` **required** — the person/model photo (URL or local file).
- `--type full` (default) needs `--garment`; `--type upper` needs both `--upper`
  and `--lower`.
- `--background` and `--prompt` only apply with `qimi_2.5`/`qimi_3`.
- Default model: `qimi_3`.
- Output job hint: `vto_<n>`.

## `qm fashion` — outfit lookbook

```
qm fashion --outfit <id...> [--mode <m>] [--kol-kind user_kol|system_kol] [--kol-id <id>] [--model <m>] [--crid <id>]
```

- `--outfit <id...>` **required** — one or more `outfit_ids` from
  `qm assets outfits`.
- `--mode` (server-validated; examples): `kol_outfit` (outfit worn by a KOL —
  needs `--kol-id`), `outfit_only` (styled flat-lay/ghost-mannequin, no person),
  `kol_couple` (two KOLs). If unsure which modes are valid, omit `--mode` and let
  the server default apply, or ask the user to confirm the look they want.
- `--kol-kind` distinguishes the user's own saved KOL (`user_kol`) vs a
  system/preset avatar (`system_kol`).
- Output job hint: `fsh_<n>`.

## Quote, then confirm

Both commands charge **per resulting image** — `qm fashion` in particular can
produce multiple poses/results (`total_results` in the response), so the exact
count may only be pinned down after submission. Tell the user the model's
per-image credit rate from `qm models list` up front, and confirm intent to
proceed before running either command — submitting holds credit immediately.

## Run + track

Neither command has `--wait`. Copy the job id from the printed hint
(`→ Theo dõi: quickmagic jobs get vto_5` / `fsh_9`), then:

- `qm tryon` → `qm jobs wait vto_5 --out ./out` (single `result_url` —
  auto-downloads fine).
- `qm fashion` → `qm jobs wait fsh_9 --out ./out` polls status but **won't
  auto-download** (the job returns an array, not one `result_url`). Once
  `completed`, run `qm jobs get fsh_9` and read `results[]`
  (`{status, url, pose_index}`) — report each `url`.

## Errors

`Không đủ credit: ...` → state the shortfall + suggest
https://quickmagic.vn/pricing. Otherwise relay the CLI's `Lỗi: <message>`
verbatim. Full reference: `quickmagic-account` skill.

## Examples

```bash
qm assets outfits
qm assets kols
qm fashion --outfit 12 15 --mode kol_outfit --kol-id 3 --model qimi_3
qm jobs wait fsh_9 --out ./out

qm tryon --model-image ./person.jpg --garment ./dress.jpg --model qimi_3
qm jobs wait vto_5 --out ./out
```
