# Quick Magic CLI — Agent Skills

8 Agent Skills that wrap the `quickmagic` / `qm` CLI so a coding agent (Claude
Code and compatible tools) can drive Quick Magic directly from the terminal —
mirroring the `npx skills add higgsfield-ai/skills` pattern (`/higgsfield:generate`
etc.), tailored to Quick Magic's own REST API and CLI.

Each skill is a `skills/<name>/SKILL.md` (frontmatter `name` + `description` —
the `description` doubles as the router/trigger contract an agent uses to decide
when to load the skill).

## Install

**Requires the CLI itself first** — see `cli-quickmagic/README.md`
(`npm install -g .` or `npm link` from the `cli-quickmagic/` folder), then
`qm auth login` once per machine.

Option 1 — `npx skills` (if this repo is published as a skills package):

```bash
npx skills add Tungbillee/cli-quickmagic --skills quickmagic-account,quickmagic-generate,quickmagic-product-photoshoot,quickmagic-fashion,quickmagic-cutout,quickmagic-hook-video,quickmagic-edit-image,quickmagic-subtitle-split
```

Option 2 — copy directly into a project's or your user's Claude skills folder:

```bash
# project-level (this repo, active for anyone working in it)
mkdir -p .claude/skills && cp -r cli-quickmagic/skills/quickmagic-* .claude/skills/

# user-level (active in every project)
mkdir -p ~/.claude/skills && cp -r cli-quickmagic/skills/quickmagic-* ~/.claude/skills/
```

## Skills

| Skill | Wraps | Use for |
|---|---|---|
| `quickmagic-account` | `auth`, `credits`, `models list`, `jobs get/wait` | login/status, credit balance + Qimi free-window benefit, model catalog, job polling — **foundation** the other 7 skills reference |
| `quickmagic-generate` | `generate image`, `generate video` | text/reference-to-image or -video |
| `quickmagic-product-photoshoot` | `product` | studio/marketing photos of a product (packshot/poster/infographic/composite) |
| `quickmagic-fashion` | `fashion`, `tryon` | outfit lookbook shoots vs. virtual try-on on a specific person photo |
| `quickmagic-cutout` | `cutout` | transparent PNG cutouts / scene remix |
| `quickmagic-hook-video` | `hook presets`, `hook video` | ~10s comedy ad video from a character + product photo (18 presets) |
| `quickmagic-edit-image` | `edit` | restore / upscale (2k/4k) / beauty / muscle / color_boost on an existing image |
| `quickmagic-subtitle-split` | `subtitle`, `split` | auto subtitles/dubbing, long-video → short clips |

## Shared conventions (all 8 skills)

- Check `qm auth status` first; if not logged in, tell the user to run
  `qm auth login`.
- Quote the credit cost (from `qm models list` / a preset's `credit_cost`) and
  get explicit user confirmation **before** running any command that spends
  credit — submission holds credit immediately. `subtitle`/`split` are the one
  exception: price is duration-based and only known after submission, so the
  skill asks for a go-ahead instead of a number.
- Surface `insufficient_credit` (`Không đủ credit: ... thiếu Zcr`) with the exact
  shortfall and a link to top up (https://quickmagic.vn/pricing).
- Never poll `jobs get` manually — use `qm jobs wait <id> [--out dir]`. Note that
  `--out` only auto-downloads for job types with a single `result_url`
  (image/video/tryon/edit/hook/subtitle); product/fashion/cutout/split return
  arrays and must be read back with `qm jobs get <id>` after completion.
  See `quickmagic-account` for the full job-id-prefix table.
- Always end with the final result URL(s) plus the credit amount already
  charged/held.

See each skill's `SKILL.md` for exact CLI flags and feature-specific
error-handling.
