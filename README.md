# 💨 midnight-smoker

> Run smoke tests against packages as they would be published

## Motivation

This thing helps prevent you from publishing something which passes all the tests, but is misconfigured or fails when a consumer tries to install or run it.

Examples of things that would be a problem:

- Missing files in published package
- `devDepenencies` which should be `dependencies`
- Weirdo `exports` configuration
- Wonky lifecycle scripts

`midnight-smoker` is intended to run in CI or in a pre-publish lifecycle script.

## Example Usage

<!-- x-release-please-start-version -->

```bash
npx midnight-smoker test:smoke # runs npm script "test:smoke"
💨 midnight-smoker v1.0.0
✔ Found npm at /wherever/npm/lives/bin/npm
✔ Packed 1 package
✔ Installed 1 package
✔ Successfully ran 1 script
✔ Lovey-dovey! 💖
```

`midnight-smoker` is compatible with npm workspaces and stuff.

<!-- x-release-please-end -->

**Run `npx midnight-smoker --help`** for more information.

## What It Does

Three (3) things:

1. It runs `npm pack` on the package(s)
2. Installs the resulting tarballs to a temp dir (or dir of your choosing)
3. Runs an npm script (from the `scripts` field of your `package.json`) within the installed package

That's it. That's the project.

## Installation

You can use `npx` or just `npm install midnight-smoker -D`.

Requires Node.js v14.0.0 or higher.

## Notes

That song sucks.

## License

Copyright © 2022 [Christopher "boneskull" Hiller](https://github.com/boneskull). Licensed Apache-2.0
