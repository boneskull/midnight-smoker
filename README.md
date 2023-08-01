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

<!-- x-release-please-end -->

`midnight-smoker` is compatible with npm workspaces and stuff.

## What It Does

Three (3) things:

1. It runs `npm pack` on the package(s)
2. Installs the resulting tarball(s) to a temp dir (or dir of your choosing) using [`--install-strategy=shallow`/`--global-style`](https://docs.npmjs.com/cli/v9/using-npm/config#install-strategy) to avoid hoisting/deduping. This will install _only_ "production" dependencies.
3. For each package, executes `npm run <script>` with `/some/tmp/dir/node_modules/<package>` as the current working directory

This means whatever script gets run will _not_ have access to your testing framework, linter, etc.

## Usage

Depending on your setup, one of these should work:

### For Single-Package Repos

Add two scripts to your `package.json`. The first script will run `smoker <second-script>`.

```json
{
  "scripts": {
    "test:smoke": "smoker smoke",
    "smoke": "node ./some-script.js"
  }
}
```

### For Repos Using npm Workspaces

Add a script to your **root** `package.json`:

```json
{
  "scripts": {
    "test:smoke": "smoker --all smoke"
  }
}
```

The `--all` flag tells `midnight-smoker` to run the `smoke` script in all workspaces. For each workspace, add a `smoke` script, changing the behavior as needed:

```json
{
  "scripts": {
    "smoke": "node ./some-script.js"
  }
}
```

### Try It

Feeling lucky? Run `npm run test:smoke`.

**Run `npx midnight-smoker --help`** to see more options.

> Note: You can name your scripts whatever you want; there is nothing special about `smoke` or `test:smoke`.

### Wait—What Should My Script Do?

In many cases, executing the package's entry point might be enough:

```json
{
  "main": "dist/index.js",
  "scripts": {
    "test:smoke": "smoker run-entry-point",
    "run-entry-point": "node ."
  }
}
```

Otherwise:

- If your package distributes an executable, you might want to run that instead, and give it some common arguments (assuming it depends on your entry point). _Or_ you could go BUCK WILD and run it a bunch of different ways.
- If your package is lazy-loading its dependencies--like if you have a `require()` or `await import()` within some function that isn't called at startup--you may need to do more work than this.

### But I Need a Dev Tool To Run My Script

OK--_fine_--but this is not necessarily recommended, because the result is not what a consumer would get. How much does that matter? You decide.

Provide the `--add <thing>` option to `midnight-smoker`, where `thing` is anything `npm install <thing>` could install:

```json
{
  "scripts": {
    "test:smoke": "smoker --add ts-node smoke",
    "smoke": "ts-node ./some-script.ts"
  },
  "devDependencies": {
    "ts-node": "10.9.1"
  }
}
```

If unspecified in `--add`, `midnight-smoker` will use the version of the dependency in the package's `devDependencies`/`dependencies`/`optionalDependencies`/`peerDepedenencies` (in that order). If it does not appear in any of these fields, it will just pull down the `latest` tag of the dependency.

`--add` can be provided multiple times.

## Installation

Run `npm install midnight-smoker --save-dev`.

- Minimum Node.js versions supported: `^16.13.0 || >=18.0.0`
- Minimum `npm` version supported: `v7.0.0`

## Resources

- GitHub Action: [**node-js-production-test-action**](https://github.com/marketplace/actions/node-js-production-test-action)

  > I recommend adding `midnight-smoker` as a dev dep, but the above action is just a wrapper around `midnight-smoker`.

## Notes

That song sucks.

## License

Copyright © 2022 [Christopher "boneskull" Hiller](https://github.com/boneskull). Licensed Apache-2.0
