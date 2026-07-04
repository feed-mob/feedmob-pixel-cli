# feedmob-pixel-cli

`fpc` is a read-only Node CLI for querying the FeedMob Pixel Dashboard API from any working directory.

It uses Dashboard API tokens, writes JSON to stdout by default, and can export category records as CSV.

## Install

```bash
npm install -g @feedmob/feedmob-pixel-cli
command -v fpc
fpc --version
```

The npm package is `@feedmob/feedmob-pixel-cli`; the installed command is `fpc`.

Some npm versions hide successful install script output and only print `added packages`. If that happens, start with:

```bash
fpc --help
fpc doctor
```

## Update

`fpc` checks the latest npm version on each run. If the installed version is behind, it prints an update notice to stderr while keeping stdout usable for normal command output.

Check whether the global install is behind the latest published version:

```bash
fpc --version
npm outdated -g @feedmob/feedmob-pixel-cli
```

If `npm outdated` prints a row for `@feedmob/feedmob-pixel-cli`, update and confirm the installed version:

```bash
npm install -g @feedmob/feedmob-pixel-cli@latest
fpc --version
fpc doctor
```

## Quick Start

Configure a Dashboard API token:

```bash
mkdir -p ~/.fpc
chmod 700 ~/.fpc
printf '%s\n' 'FEEDMOB_PIXEL_API_TOKEN=fmpat_xxx' > ~/.fpc/.env
chmod 600 ~/.fpc/.env
fpc doctor
```

Discover valid query values before requesting data:

```bash
fpc advertisers list
fpc tv-platforms list --advertiser chime
fpc categories list \
  --advertiser chime \
  --event-type registration \
  --tv lg-tv \
  --impression-start 2026-06-01 \
  --impression-end 2026-06-30
```

Then query summary or records with a discovered category value:

```bash
fpc summary get \
  --advertiser chime \
  --event-type registration \
  --tv lg-tv \
  --impression-start 2026-06-01 \
  --impression-end 2026-06-30
```

Summary output includes totals, category counts, the current attribution window under `attributionWindow`, and
Direct CTV attributed records under `attributed.records`. `attributed.total` is the sum of Direct CTV category
counts, while `assistedTotal` and `totalRegistrations` correspond to the dashboard's assisted and total registration
figures. If `--max-attribution-hours` is omitted, `fpc` uses 14 days (`336` hours).

```bash
fpc records list direct-lg-ctv \
  --advertiser chime \
  --event-type registration \
  --tv lg-tv \
  --page 1 \
  --per-page 100
```

## Configuration

`fpc` needs a FeedMob Pixel API token. For persistent local setup, store it in `~/.fpc/.env`:

```bash
mkdir -p ~/.fpc
chmod 700 ~/.fpc
printf '%s\n' 'FEEDMOB_PIXEL_API_TOKEN=fmpat_xxx' > ~/.fpc/.env
chmod 600 ~/.fpc/.env
fpc doctor
```

For a one-off shell session, export the token before running commands:

```bash
export FEEDMOB_PIXEL_API_TOKEN='fmpat_xxx'
fpc doctor
```

Keep `~/.fpc/.env` local to your machine. Avoid storing real tokens in repo files, shell history, logs, screenshots, or generated fixtures.

## Agent Skill

A companion Agent Skill is available in the `feed-mob/skills` repository: [feedmob-pixel-cli](https://github.com/feed-mob/skills/tree/main/skills/feedmob-pixel-cli).
Use it when asking Codex, Claude Code, or another Agent Skills-compatible assistant to query FeedMob Pixel Dashboard data with `fpc`.

The skill guides agents to:

- verify the local `fpc` install and run `fpc doctor` before querying;
- keep Dashboard API tokens local and out of repos, logs, screenshots, and generated fixtures;
- discover advertiser, event type, TV platform, and category values before using them;
- use `summary get`, `records list`, and `records export` for read-only Dashboard data workflows;
- use raw `GET` or `HEAD` requests only when the high-level commands do not cover the read;
- apply the correct date-mode rules, including `--registration-date-mode auto` for linked impression/registration-date behavior and `manual` for explicit registration date ranges.

## More Docs

- [Usage reference](docs/usage.md): command examples, date modes, CSV export, raw requests, JSON policy, and flag mapping.
- [Development and release](docs/development.md): local setup, testing, local install, tarball checks, and npm publishing flow.

## Common Commands

```bash
fpc doctor
fpc advertisers list
fpc tv-platforms list --advertiser chime
fpc categories list --advertiser chime --event-type registration --tv lg-tv
fpc summary get --advertiser chime --event-type registration --tv lg-tv
fpc records export direct-lg-ctv --advertiser chime --event-type registration --tv lg-tv --out ./direct-lg-ctv.csv
```
