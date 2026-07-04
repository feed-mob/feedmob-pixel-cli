#!/usr/bin/env node

const message = `
fpc installed - FeedMob Pixel Dashboard CLI.

What it does:
  - Read-only Dashboard API queries from any working directory.
  - Discover advertisers, TV platforms, categories, summaries, records, and CSV exports.
  - Write stable JSON by default and avoid printing API tokens.

Quick start:
  1. Confirm the command is available:
     fpc --version
     fpc --help

  2. Configure a Dashboard API token:
     export FEEDMOB_PIXEL_API_TOKEN='fmpat_xxx'

     The production Dashboard URL is already configured:
     https://feedmob-pixel-dashboard.feedmob.com/

     Or store only the token environment variable name:
     fpc init --token-env-var FEEDMOB_PIXEL_API_TOKEN

     Local config defaults to:
     ~/.fpc/config.json
     ~/.fpc/.env

  3. Check setup:
     fpc doctor

  4. Start discovery:
     fpc advertisers list
     fpc tv-platforms list --advertiser chime

Docs:
  https://github.com/feed-mob/feedmob-pixel-cli#readme

Never commit, paste, or log real API tokens.
`

process.stdout.write(message)
