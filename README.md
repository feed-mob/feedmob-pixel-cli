# feedmob-pixel-cli

`fpc` is a read-only TypeScript/Node CLI for querying the FeedMob Pixel Dashboard API from any working directory.

It uses the Dashboard Bearer-token API, writes stable JSON with `--json`, and downloads category record exports as CSV.

## Install

Install the published npm package:

```bash
npm install -g @feedmob/feedmob-pixel-cli
command -v fpc
fpc --version
```

After installation, configure a Dashboard API token before making API calls:

```bash
export FEEDMOB_DASHBOARD_API_TOKEN='fmpat_xxx'
fpc --json doctor
```

The npm package is `@feedmob/feedmob-pixel-cli`; the installed command is `fpc`.

Some npm versions hide successful install script output and only print `added packages`. If that happens, start with `fpc --help` and `fpc --json doctor`.

Install from this repo for local testing:

```bash
npm install -g .
command -v fpc
```

Install from a packed tarball:

```bash
npm pack
npm install -g ./feedmob-feedmob-pixel-cli-*.tgz
command -v fpc
```

For local development:

```bash
pnpm install
pnpm build
pnpm test
make install-local
command -v fpc
```

`make install-local` installs a small wrapper at `~/.local/bin/fpc`. npm global install links the package-managed `fpc` binary. Ensure the relevant bin directory is on your `PATH`.

## Development

Install dependencies, build the TypeScript output, and run tests:

```bash
pnpm install
pnpm build
pnpm test
```

`pnpm build` and `pnpm test` generate `src/generated/version.ts` from `package.json.version` before compiling or running tests. Do not edit generated version files by hand.

## Release

The package is published to npm as `@feedmob/feedmob-pixel-cli`.

1. Bump `package.json.version`.
2. Run `pnpm test` and `npm pack --dry-run`.
3. Merge the release change to `main`.

The `Publish to npm` GitHub Actions workflow runs on pushes to `main`, checks whether the current `name@version` already exists on npm, and publishes only unpublished versions. npm Trusted Publisher should be configured for repository `feed-mob/feedmob-pixel-cli` and workflow filename `publish.yml`.

## Configure

The production Dashboard base URL is fixed by default:

```bash
https://feedmob-pixel-dashboard.feedmob.com/
```

You only need `fpc init` when you want to store token environment preferences or override the URL for local development.

Production with a configured token environment variable name:

```bash
fpc init --token-env-var FEEDMOB_PIXEL_API_TOKEN
```

Local Rails/Dashboard:

```bash
fpc init --base-url http://localhost:3000
```

Config is stored at `~/.feedpix/config.json`. Local environment variables may be stored in `~/.feedpix/.env`.

The CLI accepts a base URL from these sources, in order:

1. `FEEDMOB_DASHBOARD_BASE_URL` or `FEEDPIX_BASE_URL`
2. `~/.feedpix/.env`, or the file named by `FEEDPIX_ENV_FILE`
3. `~/.feedpix/config.json`
4. fixed default `https://feedmob-pixel-dashboard.feedmob.com/`

## Authentication

The CLI authenticates only with a Dashboard API Token. It does not perform OAuth. If you need a new token, use the Dashboard UI/API Settings page to generate one, then place it in your local environment.

Preferred auth:

```bash
export FEEDMOB_DASHBOARD_API_TOKEN='fmpat_xxx'
fpc --json doctor
```

Custom token env var configured in `config.json`:

```bash
fpc init --token-env-var FEEDMOB_PIXEL_API_TOKEN
export FEEDMOB_PIXEL_API_TOKEN='fmpat_xxx'
fpc --json doctor
```

Persistent local env file:

```bash
mkdir -p ~/.feedpix
chmod 700 ~/.feedpix
printf '%s\n' \
  'FEEDMOB_DASHBOARD_BASE_URL=https://feedmob-pixel-dashboard.feedmob.com' \
  'FEEDMOB_DASHBOARD_API_TOKEN=fmpat_xxx' \
  > ~/.feedpix/.env
chmod 600 ~/.feedpix/.env
fpc --json doctor
```

Persistent local env file with a configured token variable name:

```bash
fpc init --token-env-var FEEDMOB_PIXEL_API_TOKEN
printf '%s\n' 'FEEDMOB_PIXEL_API_TOKEN=fmpat_xxx' >> ~/.feedpix/.env
fpc --json doctor
```

Custom env file:

```bash
FEEDPIX_ENV_FILE=/path/to/fpc.env fpc --json doctor
```

Token sources, in order:

1. `FEEDMOB_DASHBOARD_API_TOKEN` or `FEEDPIX_TOKEN`
2. the custom env var configured with `fpc init --token-env-var NAME`
3. `FEEDMOB_DASHBOARD_API_TOKEN` or `FEEDPIX_TOKEN` from `~/.feedpix/.env`, or the file named by `FEEDPIX_ENV_FILE`
4. the custom env var from that local env file
5. `~/.feedpix/config.json` only if explicitly written with `fpc init --token ...`

Avoid storing tokens in repo files, shell history, logs, screenshots, or generated fixtures.

## Doctor

```bash
fpc --json doctor
```

When setup is missing, `doctor` exits successfully and returns machine-readable setup status:

```json
{
  "setup": {
    "ok": false,
    "missing": ["baseUrl", "token"]
  }
}
```

## Metadata Discovery

Start every new workflow by discovering valid values. Do not invent advertiser, event type, TV platform, or category values.

```bash
fpc --json advertisers list
```

```bash
fpc --json tv-platforms list --advertiser chime
```

```bash
fpc --json categories list \
  --advertiser chime \
  --event-type registration \
  --tv lg-tv \
  --registration-date-mode auto \
  --impression-start 2026-06-01 \
  --impression-end 2026-06-30
```

Use `category.value` or `category.slug` from `categories list` for records and exports. Only drill into categories where `canViewDetails` is `true`.

## Summary

```bash
fpc --json summary get \
  --advertiser chime \
  --event-type registration \
  --tv lg-tv \
  --registration-date-mode auto \
  --impression-start 2026-06-01 \
  --impression-end 2026-06-30
```

## Records

List one page:

```bash
fpc --json records list direct-lg-ctv \
  --advertiser chime \
  --event-type registration \
  --tv lg-tv \
  --page 1 \
  --per-page 100
```

Fetch multiple pages:

```bash
fpc --json records list direct-lg-ctv \
  --advertiser chime \
  --event-type registration \
  --tv lg-tv \
  --all-pages \
  --max-pages 5
```

`--per-page` defaults to `100` and is capped at `500`.

## CSV Export

CSV export treats the response as text, not JSON. `--out` is required.

```bash
fpc records export direct-lg-ctv \
  --advertiser chime \
  --event-type registration \
  --tv lg-tv \
  --impression-start 2026-06-01 \
  --impression-end 2026-06-30 \
  --out ./direct-lg-ctv.csv
```

JSON mode returns file metadata:

```bash
fpc --json records export direct-lg-ctv \
  --advertiser chime \
  --event-type registration \
  --tv lg-tv \
  --impression-start 2026-06-01 \
  --impression-end 2026-06-30 \
  --out ./direct-lg-ctv.csv
```

```json
{
  "path": "/absolute/path/direct-lg-ctv.csv",
  "bytes": 123,
  "contentType": "text/csv"
}
```

## Raw Read-only Request

The raw escape hatch supports only `GET` and `HEAD`.

```bash
fpc --json request get /api/v1/dashboard_api/summary \
  --query advertiser=chime \
  --query tv=lg-tv
```

```bash
fpc --json request head /api/v1/dashboard_api/advertisers
```

Raw requests use the same base URL, Bearer auth, path normalization, error handling, and redaction as high-level commands.

## Date Modes

Default mode is `registrationDateMode=auto`. In auto mode, pass impression dates and let the backend derive registration dates:

```bash
--registration-date-mode auto \
--impression-start 2026-06-01 \
--impression-end 2026-06-30
```

Manual mode allows registration dates and `dateFilterMode=or`:

```bash
--registration-date-mode manual \
--impression-start 2026-06-01 \
--impression-end 2026-06-30 \
--registration-start 2026-06-01 \
--registration-end 2026-06-30 \
--date-filter-mode or
```

## JSON Policy

With `--json`:

- stdout contains JSON only.
- diagnostics and warnings go to stderr.
- errors use a stable shape:

```json
{
  "error": {
    "type": "auth_error",
    "message": "Unauthorized",
    "status": 401
  }
}
```

- tokens, cookies, and sensitive headers are not printed.
- high-level JSON commands include API data and `_request` metadata, except CSV export which returns only file metadata.

## Flag Mapping

CLI flags use kebab-case and API query keys use the Dashboard contract:

| CLI flag | API query |
| --- | --- |
| `--event-type` | `eventType` |
| `--tv` | `tv` |
| `--registration-date-mode` | `registrationDateMode` |
| `--impression-start` | `impressionStartDate` |
| `--impression-end` | `impressionEndDate` |
| `--registration-start` | `registrationStartDate` |
| `--registration-end` | `registrationEndDate` |
| `--date-filter-mode` | `dateFilterMode` |
| `--max-attribution-hours` | `maxImpressionToRegistration` |
| `--per-page` | `perPage` |

## Live Smoke Test

Live calls are not part of the default test suite. When you have a token:

```bash
fpc --json doctor
fpc --json advertisers list
```

Unit tests use local fixtures/mocks only:

```bash
pnpm test
```
