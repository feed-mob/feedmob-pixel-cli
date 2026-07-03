#!/usr/bin/env node

const message = `
feedpix installed.

Next steps:
  1. Configure a Dashboard API token:
     export FEEDMOB_DASHBOARD_API_TOKEN='fmpat_xxx'

     The production Dashboard URL is already fixed:
     https://feedmob-pixel-dashboard.feedmob.com/

     or store only the token environment variable name:
     feedpix init --token-env-var FEEDMOB_PIXEL_API_TOKEN

  2. Check setup:
     feedpix --json doctor

Never commit, paste, or log real API tokens.
`

process.stdout.write(message)
