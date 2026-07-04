# Development and Release

## Local Development

Install dependencies, build the TypeScript output, and run tests:

```bash
pnpm install
pnpm build
pnpm test
```

`pnpm build` and `pnpm test` generate `src/generated/version.ts` from `package.json.version` before compiling or running tests. Do not edit generated version files by hand.

## Local Install

Install from this repo for local testing:

```bash
pnpm install
pnpm build
npm install -g .
command -v fpc
fpc --version
```

Install from a packed tarball:

```bash
npm pack
npm install -g ./feedmob-feedmob-pixel-cli-*.tgz
command -v fpc
```

For the local wrapper workflow:

```bash
pnpm install
pnpm build
pnpm test
make install-local
command -v fpc
```

`make install-local` installs a small wrapper at `~/.local/bin/fpc`. npm global install links the package-managed `fpc` binary. Ensure the relevant bin directory is on your `PATH`.

## Live Smoke Test

Live calls are not part of the default test suite. When you have a token:

```bash
fpc doctor
fpc advertisers list
```

Unit tests use local fixtures/mocks only:

```bash
pnpm test
```

## Release

The package is published to npm as `@feedmob/feedmob-pixel-cli`.

1. Bump `package.json.version`.
2. Run `pnpm test` and `npm pack --dry-run`.
3. Merge the release change to `main`.

The `Publish to npm` GitHub Actions workflow runs on pushes to `main`, checks whether the current `name@version` already exists on npm, and publishes only unpublished versions.

npm Trusted Publisher should be configured for:

- Repository: `feed-mob/feedmob-pixel-cli`
- Workflow filename: `publish.yml`
