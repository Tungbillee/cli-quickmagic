---
name: quickmagic-tts
description: >-
  Convert text to speech, or clone a custom voice, via the Quick Magic CLI
  (`qm tts`, `qm voices list/clone/delete`). Covers 5 TTS engines (qimi_1.5,
  qimi_2.5, qimi_3, qimi_5, qimi_5.5) — the last two add 310 built-in system
  voices across 16 languages plus optional user voice cloning. Triggers:
  "đọc văn bản thành giọng nói", "chuyển text thành giọng nói", "clone giọng",
  "tạo giọng riêng", "nhân bản giọng nói", "text to speech", "voice clone",
  "TTS", "read this text aloud", "convert text to audio".
---

# quickmagic-tts — Text-to-Speech & Voice Cloning

Wraps `qm tts` and `qm voices list/clone/delete`. Use whenever the user wants
text read aloud as audio, or wants a custom cloned voice for future TTS calls.

## Commands

| Command | Required flags | Key optional flags |
|---|---|---|
| `qm tts` | `--text <t>` or `--file <path>`, `--voice <v>` | `--model <m>` (default `qimi_3`), `--language <l>`, `--speed <n>` (0.5-2.0, qimi_5/qimi_5.5 only), `--style <s>`, `--title <t>`, `--crid <id>`, `--wait`, `--out <dir>` |
| `qm voices list` | `--model <m>` | `--language <l>`, `--search <s>`, `--limit <n>` (default 50, max 100 — qimi_1.5 has 535 voices and qimi_5 310+: use `--language`/`--search` to narrow instead of paging) |
| `qm voices clone` | `--audio <file\|url>`, `--name <n>` | `--crid <id>` (auto-generated if omitted), `--wait` |
| `qm voices delete <id>` | `<id>` (`voc_12` or bare `12`) | — |

## Models — always read the price at runtime

| Model | Billing | Char limit | Voices |
|---|---|---|---|
| `qimi_1.5` | flat credits/call | 50,000 | fixed catalog |
| `qimi_2.5` | flat credits/call | 30,000 | fixed catalog |
| `qimi_3` (default) | flat credits/call | 30,000 | fixed catalog |
| `qimi_5` | credits/character, with a minimum charge | 10,000 | 310 system voices (16 languages) + your own clones |
| `qimi_5.5` | credits/character (higher quality), with a minimum charge | 10,000 | 310 system voices (16 languages) + your own clones |

Reference only, as of 260817 — **never quote these from memory**. Always run
`qm voices list --model <m>` and read the `pricing` object from its response:
roughly `qimi_1.5`/`qimi_2.5` ≈ 2cr/call, `qimi_3` ≈ 4cr/call, `qimi_5` ≈
0.09cr/char, `qimi_5.5` ≈ 0.15cr/char (min ~5cr) — rates can change. Voice
cloning is a separate, much larger flat charge (~2,230cr) — see "Cloning a
custom voice" below.

## Pick a voice

```bash
qm voices list --model qimi_1.5 --language "Tiếng Việt"   # qimi_3 has no per-language labels (all "Đa ngôn ngữ (70+)") — omit --language for it
qm voices list --model qimi_5 --search Minh --limit 20
```

- Use the **`VOICE`** column value as `--voice` on `qm tts` — not `NAME`.
- Pass `--language` whenever a voice name repeats across languages (e.g. an
  `Aarav` voice exists in both English and Hindi) so the server picks the
  right one.
- `qimi_1.5`/`qimi_2.5`/`qimi_3` list a fixed catalog with a `STYLES` column
  (labels like "Vui vẻ"/"Formal") — pass the exact label as `--style`.
  `qimi_5`/`qimi_5.5` voices don't take `--style`.
- `qimi_5`/`qimi_5.5` output splits into **"Giọng của bạn"** (voices you
  cloned) and **"Giọng hệ thống"** (310 system voices, 16 languages) —
  cloning is optional, try a system voice first. Each system voice reads
  most naturally in its own source language (it can still read all ~40
  supported languages) — for Vietnamese text, prefer a `Tiếng Việt`-tagged
  voice or a voice you cloned yourself.

## Reading text aloud

```bash
qm tts --text "Xin chào, đây là bản demo." --voice <voice_id> --model qimi_3 --wait --out ./out
qm tts --file ./script.txt --voice <voice_id> --model qimi_5 --language "Tiếng Việt" --speed 1.1 --wait --out ./out
```

- `--file` reads local UTF-8 text — use it instead of `--text` for long
  scripts.
- The CLI prints the character count before submitting; sanity-check it
  against the model's char limit above to avoid a `char_limit_exceeded`.
- Without `--wait`, note the printed job id (`tts_<n>`) and run
  `qm jobs wait tts_<n> --out ./out` separately — it auto-downloads the mp3
  (single `result_url`).

## Cloning a custom voice (optional, for qimi_5/qimi_5.5)

```bash
qm voices clone --audio ./sample.wav --name "Giọng của tôi" --wait
qm voices clone --audio https://files.quickmagic.cloud/... --name "Alt voice" --crid my-retry-key
```

- `--audio` accepts a **local audio file** (auto-uploaded to Quick Magic
  first) or an **existing Quick Magic file URL** — an arbitrary external URL
  is rejected (`invalid_source`).
- Sample length **10 seconds – 5 minutes**, size **≤ 20MB**.
- `--crid` is optional here: if omitted the CLI derives one from the file
  bytes + name, so an accidental retry of the exact same file+name never
  double-clones or double-charges.
- Before running, read `clone_price` and `first_free_available` from
  `qm voices list --model qimi_5` — the **first clone may be free**, but only
  for an account with an **active paid plan** (never on the free tier).
- Job id is `voc_<n>` and has **no `result_url`**: `qm jobs wait voc_<n>` only
  polls status; once `completed`, run `qm jobs get voc_<n>` and read
  `voice` / `sample_url` (or pass `--wait` to `qm voices clone`, which prints them). Use that same name as `--voice` on `qm tts` with
  `--model qimi_5` (or `qimi_5.5`).
- Uploaded sample files live in temporary Quick Magic storage (auto-deleted
  after ~5 days) — that's fine, they're only needed once, during cloning.

## Deleting a cloned voice

```bash
qm voices delete voc_12
```

No refund. Fails with `VOICE_BUSY` if the voice is still being processed, or
if a `qm tts` job is currently reading with it — wait for that job to finish,
then retry the delete.

## Pricing — quote, then confirm

1. `qm voices list --model <m> [...]` → read `pricing` (plus `clone_price` /
   `first_free_available` for `qimi_5`/`qimi_5.5`).
2. State the estimated cost to the user (character count × per-char rate, or
   the flat per-call price) and get explicit confirmation.
3. Only then run `qm tts` / `qm voices clone` — submission holds credit
   immediately.

**Retries (same rule for both `qm tts --crid` and `qm voices clone`):**
retrying the *same* crid **after a failed** attempt (e.g.
`insufficient_credit`) starts a **new** job — a failed attempt does not keep
the crid reserved, so it's always safe to resubmit unchanged. Replaying the
crid of a job that's still **in progress** instead returns
`idempotent_replay: true` with the real `credits_held`/`status` — no new job,
no double charge. `qm voices clone` auto-generates its own crid from the
file bytes + name when `--crid` is omitted (see "Cloning a custom voice"
above) — the same failed-vs-in-progress behavior applies to that
auto-generated crid too.

## Errors

CLI prints `Lỗi [code]: message`. Common codes:

| Code | Meaning | What to do |
|---|---|---|
| `invalid_model` | `--model` not one of the 5 keys (e.g. `v3`) | use `qimi_1.5|qimi_2.5|qimi_3|qimi_5|qimi_5.5` |
| `voice_not_found` | bad/unknown `--voice` | re-pick from `qm voices list`; if the name repeats across languages, add `--language` |
| `invalid_style` | `--style` isn't in that voice's `styles` | use the exact label from the `STYLES` column |
| `invalid_speed` | outside 0.5-2.0, or `--speed` used with qimi_1.5/2.5/3 | clamp to range; only pass `--speed` for qimi_5/qimi_5.5 |
| `char_limit_exceeded` | text longer than the model's char limit | split the text into smaller chunks |
| `insufficient_credit` / `negative_balance` | not enough balance | state the exact shortfall and https://quickmagic.vn/pricing |
| `rate_limited` / `concurrent_limit` / `busy` | too many requests/jobs right now | wait, then retry |
| `feature_disabled` | TTS or cloning temporarily off | tell the user, don't retry |
| `VOICE_BUSY` | voice is still cloning, or in use by an in-progress `qm tts` job | wait for that job to finish before deleting/reusing it |
| `duplicate_name` | clone `--name` already used | pick a different name |
| `invalid_source` | `--audio` isn't a local file or a Quick Magic URL | re-upload, or pass a valid Quick Magic file URL |
| `pending_limit` | too many jobs already queued | wait for some to finish |

Full auth/job/error-code reference: `quickmagic-account` skill.

## Examples

```bash
qm auth status
qm voices list --model qimi_1.5 --language "Tiếng Việt"   # qimi_3 has no per-language labels (all "Đa ngôn ngữ (70+)") — omit --language for it
qm tts --text "Chào mừng đến với Quick Magic." --voice <voice_id> --model qimi_3 --wait --out ./out

qm voices list --model qimi_5
qm voices clone --audio ./mysample.wav --name "Giọng riêng" --wait
qm tts --text "Đọc bằng giọng của tôi." --voice "Giọng riêng" --model qimi_5 --wait --out ./out

qm voices delete voc_12
```
