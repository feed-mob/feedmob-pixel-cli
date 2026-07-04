# Usage Reference

`fpc` prints JSON to stdout by default. Diagnostics, warnings, and install guidance go to stderr or npm lifecycle output.

## Install Updates

`fpc` checks the latest npm version on each run. If the installed version is behind, it prints a notice to stderr:

```text
fpc update available: 0.1.5 -> 0.1.6
Run: npm install -g @feedmob/feedmob-pixel-cli@latest
```

stdout remains reserved for normal command output, including JSON.

Check the installed CLI version:

```bash
fpc --version
```

Check whether the globally installed npm package is outdated:

```bash
npm outdated -g @feedmob/feedmob-pixel-cli
```

No output means the global install is current. If npm prints a row for `@feedmob/feedmob-pixel-cli`, update to the latest published package:

```bash
npm install -g @feedmob/feedmob-pixel-cli@latest
fpc --version
fpc doctor
```

To see the latest published version without comparing it to your install:

```bash
npm view @feedmob/feedmob-pixel-cli version
```

## Authentication

Use a FeedMob Pixel API token. The recommended local setup is `~/.fpc/.env`:

```bash
mkdir -p ~/.fpc
chmod 700 ~/.fpc
printf '%s\n' 'FEEDMOB_PIXEL_API_TOKEN=fmpat_xxx' > ~/.fpc/.env
chmod 600 ~/.fpc/.env
fpc doctor
```

This keeps the token local to your machine and out of project files.

For a one-off shell session:

```bash
export FEEDMOB_PIXEL_API_TOKEN='fmpat_xxx'
fpc doctor
```

For automation or a non-default env file, put the same variable in a private file and point `FPC_ENV_FILE` at it:

```bash
printf '%s\n' 'FEEDMOB_PIXEL_API_TOKEN=fmpat_xxx' > /path/to/fpc.env
chmod 600 /path/to/fpc.env
FPC_ENV_FILE=/path/to/fpc.env fpc doctor
```

## Doctor

```bash
fpc doctor
```

When setup is missing, `doctor` exits successfully and returns machine-readable setup status:

```json
{
  "setup": {
    "ok": false,
    "missing": ["token"]
  }
}
```

## Discovery First

Start every new workflow by discovering valid values. Do not invent advertiser, event type, TV platform, or category values.

```bash
fpc advertisers list
```

```bash
fpc tv-platforms list --advertiser chime
```

```bash
fpc categories list \
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
fpc summary get \
  --advertiser chime \
  --event-type registration \
  --tv lg-tv \
  --registration-date-mode auto \
  --impression-start 2026-06-01 \
  --impression-end 2026-06-30
```

The summary JSON includes the dashboard totals, category counts, the current attribution window under
`attributionWindow`, and an `attributed` object. `attributed.records` contains the attributed registration records
from categories whose summary `assistedCount` is greater than zero.

If `--max-attribution-hours` is omitted, `fpc` uses a 14-day attribution window (`336` hours). Explicit values are
also reflected in `attributionWindow`.

By default, `summary get` fetches all attributed record pages with `--attributed-per-page 500`. Use
`--attributed-max-pages` to limit how many record pages are fetched per attributed category:

```bash
fpc summary get \
  --advertiser chime \
  --event-type registration \
  --tv tcl-tv \
  --impression-start 2026-07-03 \
  --impression-end 2026-07-03 \
  --max-attribution-hours 72 \
  --attributed-max-pages 1
```

## Records

List one page:

```bash
fpc records list direct-lg-ctv \
  --advertiser chime \
  --event-type registration \
  --tv lg-tv \
  --page 1 \
  --per-page 100
```

Fetch multiple pages:

```bash
fpc records list direct-lg-ctv \
  --advertiser chime \
  --event-type registration \
  --tv lg-tv \
  --all-pages \
  --max-pages 5
```

`--per-page` defaults to `100` and is capped at `500`.

## CSV Export

CSV export writes the API CSV response to the required `--out` path and prints file metadata as JSON.

```bash
fpc records export direct-lg-ctv \
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
fpc request get /api/v1/dashboard_api/summary \
  --query advertiser=chime \
  --query tv=lg-tv
```

```bash
fpc request head /api/v1/dashboard_api/advertisers
```

Raw requests use the same Bearer auth, path normalization, error handling, and redaction as high-level commands.

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
