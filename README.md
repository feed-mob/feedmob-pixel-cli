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

## Quick Start

Configure a Dashboard API token:

```bash
export FEEDMOB_PIXEL_API_TOKEN='fmpat_xxx'
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

```bash
fpc records list direct-lg-ctv \
  --advertiser chime \
  --event-type registration \
  --tv lg-tv \
  --page 1 \
  --per-page 100
```

## Configuration

The production Dashboard URL is fixed in code:

```bash
https://feedmob-pixel-dashboard.feedmob.com/
```

It is not read from `config.json`, shell env, or the local `.env` file.

Local config defaults to:

- `~/.fpc/config.json`
- `~/.fpc/.env`

Token sources, in order:

1. `FEEDMOB_PIXEL_API_TOKEN`, `FPC_TOKEN`, or legacy `FEEDPIX_TOKEN`
2. the same token env vars from `~/.fpc/.env`, or the file named by `FPC_ENV_FILE`
3. `~/.fpc/config.json` only if explicitly written with `fpc init --token ...`

Prefer shell env or a local env file over storing tokens in config:

```bash
mkdir -p ~/.fpc
chmod 700 ~/.fpc
printf '%s\n' 'FEEDMOB_PIXEL_API_TOKEN=fmpat_xxx' > ~/.fpc/.env
chmod 600 ~/.fpc/.env
fpc doctor
```

Avoid storing tokens in repo files, shell history, logs, screenshots, or generated fixtures.

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
