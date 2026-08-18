---
name: quickmagic-music
description: >-
  Generate an AI song (with vocals or instrumental) from a text description
  or your own lyrics, via the Quick Magic CLI (`qm music create/lyrics/models/get`).
  2 models (melo-3 default, melo-2), simple mode (AI writes lyrics) or custom
  mode (your own lyrics), fair 1-song-per-account queue. Triggers:
  "tạo nhạc AI", "sáng tác nhạc", "viết bài hát", "viết lời bài hát",
  "làm nhạc nền", "generate a song", "AI music", "write song lyrics",
  "compose a song", "make music", "text to music".
---

# quickmagic-music — AI Song Generation (Xưởng Nhạc "Melo")

Wraps `qm music create/lyrics/models/get`. Use whenever the user wants an AI-
generated song (vocals or instrumental) or just wants lyrics written for them.

## Commands

| Command | Required flags | Key optional flags |
|---|---|---|
| `qm music models` | — | prints KEY/LABEL/GIÁ/ETA/HÀNG CHỜ table |
| `qm music lyrics` | `--desc <d>` | `--title <t>`, `--language <l>`, `--instrumental` |
| `qm music create` | `--desc <d>` (mode simple/instrumental) or `--lyrics <l>`/`--lyrics-file <path>` (mode custom) | `--mode <m>` (default `simple`), `--model <m>` (default `melo-3`), `--styles <s>`, `--title <t>`, `--instrumental`, `--gender <g>`, `--crid <id>`, `--wait`, `--out <dir>` |
| `qm music get <id>` | `<id>` (`mus_12` or bare `12`) | — |

## Two modes

- **`--mode simple`** (default): pass `--desc` describing the vibe/topic —
  the server's internal AI songwriter writes the lyrics automatically. Good
  default when the user just describes what they want.
- **`--mode custom`**: pass `--lyrics` (inline) or `--lyrics-file <path>`
  (local UTF-8 text file, ≤3500 chars) with lyrics the user already has or
  that you drafted with `qm music lyrics` first.
- **`--instrumental`**: no vocals at all — only `--styles`/`--desc` matter,
  `--lyrics`/`--gender` are ignored.

## Pricing — always read at runtime, never hardcode

```bash
qm music models
```

Prices are **runtime-only** — currently **free during the launch phase**
(check the `GIÁ` column / `free_launch` in the raw JSON), but this can change
at any time. `qm music create` already re-reads this internally right before
submitting and passes it as a price guard — if the price changed between your
quote and the actual submit, the command fails with `price_changed` instead
of silently charging a different amount. If that happens, just re-run
`qm music models`, tell the user the new price, and get confirmation again
before retrying `qm music create`.

## Queue — fair, 1 song running per account

Each account runs **1 song at a time**; extra requests queue fairly (FIFO
across users, not first-come-first-served within a single user hogging
slots). `qm music create` prints `queue_position`/`eta_seconds` right after
submitting. **Don't poll manually** — always use `--wait` (or
`qm jobs wait mus_<n> --out <dir>` afterwards), which polls automatically and
auto-downloads the mp3 once done (single `result_url`, like `tts`/`generate
image`). A song typically finishes in under 2 minutes once it starts running,
longer if queued behind other users' jobs. A long `queued` job is **not**
necessarily an error — check `queue_position`/`eta_seconds` in `qm music get`;
`status` only flips to `stalled` once the job stops making queue progress at
all (well past the ETA), not just because it has been waiting a while.

## Workflow

```bash
qm music models                                          # 1. check current price + ETA
qm music lyrics --desc "lofi chill về mùa thu Hà Nội"      # 2. optional — preview/edit lyrics first
# ... quote the price, get explicit user confirmation ...
qm music create --mode simple --desc "lofi chill về mùa thu Hà Nội" \
  --model melo-3 --wait --out ./out                       # 3. submit + wait + auto-download mp3
```

Custom lyrics example:

```bash
qm music create --mode custom --lyrics-file ./loi-bai-hat.txt \
  --styles "V-pop, Ballad, Piano" --title "Chiều Thu" --gender female --wait --out ./out
```

Instrumental example:

```bash
qm music create --mode simple --desc "epic cinematic trailer music, orchestral, rising tension" \
  --instrumental --model melo-2 --wait --out ./out
```

## Errors

CLI prints `Lỗi [code]: message`. Common codes:

| Code | Meaning | What to do |
|---|---|---|
| `rate_limited` | more than 3 song submits/minute for this account | wait, then retry |
| `feature_disabled` | Xưởng Nhạc temporarily off | tell the user, don't retry |
| `price_changed` | price shifted between quote and submit | re-run `qm music models`, re-quote, re-confirm |
| `invalid_input` | missing/invalid `--desc`/`--lyrics`/`--model`/`--mode` for the chosen mode | check the mode's required field (see "Two modes" above) |
| `insufficient_credit` / `negative_balance` | not enough balance (only matters once pricing is no longer free) | state the exact shortfall and https://quickmagic.vn/pricing |
| `busy` | `qm music lyrics` internal writer overloaded | wait a bit, then retry `qm music lyrics`, or just supply lyrics yourself |
| `lyrics_failed` | AI songwriter couldn't produce valid lyrics after retry | try a clearer/different `--desc`, or write lyrics yourself with `--lyrics` |
| `feature_unavailable` | account temporarily blocked from this feature | tell the user, don't retry |
| `concurrent_limit` | too many jobs already running at once for the account's plan | wait for one of the running jobs to finish, then retry |
| `INVALID_PROMPT` | (uppercase, REST-only) `--lyrics` over 3500 chars or `--desc` over 500 chars | shorten the text and resubmit |

Full auth/job/error-code reference: `quickmagic-account` skill.

## Examples

```bash
qm auth status
qm music models
qm music lyrics --desc "bài hát vui về buổi sáng cà phê Sài Gòn" --title "Sài Gòn Sáng Cà Phê"
qm music create --mode simple --desc "bài hát vui về buổi sáng cà phê Sài Gòn" --wait --out ./out
qm music get mus_12
```
