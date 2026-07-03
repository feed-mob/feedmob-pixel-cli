#!/usr/bin/env node

const message = `
feedpix installed.

Next steps:
  1. Configure the Dashboard base URL:
     feedpix init --base-url https://feedmob-pixel-dashboard.feedmob.com

  2. Configure a Dashboard API token:
     export FEEDMOB_DASHBOARD_API_TOKEN='fmpat_xxx'

     or store only the token environment variable name:
     feedpix init --base-url https://feedmob-pixel-dashboard.feedmob.com --token-env-var FEEDMOB_PIXEL_API_TOKEN

  3. Check setup:
     feedpix --json doctor

Never commit, paste, or log real API tokens.
`

process.stdout.write(message)
