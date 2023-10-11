# 💨 midnight-smoker

> Smoke test your package tarball (instead of failing miserably)

## Overview

Your unit tests pass. Your integration tests pass. Linting passes. CI is green. You publish. You're basking in the post-publish glow.

But then someone installs your package, and it immediately throws an exception because that new module you just added didn't make it into the tarball. _If there was only some way to avoid this shame_, you wonder.

Yes. _This is the way._

**midnight-smoker** _obliterates_ your shame. This thing helps prevent you from publishing busted-ass packages.

A short--but profoundly incomplete--list of problems that typical tests don't catch:

- Missing files in the published package
- `devDepenencies` which should have been `dependencies`
- Weirdo `exports` configuration because it's confusing af
- Wonky `postinstall` or other lifecycle scripts

**midnight-smoker** is intended to run in prior to publish (e.g., in `prepublishOnly`) and/or as a step in your CI pipeline.

## Getting Started

### Requirements

- Node.js versions supported: `^16.20.0 || ^18.0.0 || ^20.0.0`
- Minimum `npm` version supported (if using `npm`): `v7.0.0`
- Yarn should work, generally

While odd-numbered Node.js releases _may_ work, they are not tested on and not officially supported.

### Installation

It's recommended to install **midnight-smoker** as a dev dependency:

```bash
npm install midnight-smoker --save-dev
```

### Example Usage

<!-- x-release-please-start-version -->

```bash
# runs script "test:smoke" from `package.json`
npx midnight-smoker test:smoke
```

```text
💨 midnight-smoker v5.1.0
✔ Packed 1 unique package using npm@latest…
✔ Installed 1 unique package from tarball
✔ Successfully ran 4 checks
✔ Successfully ran 1 script
✔ Lovey-dovey! 💖
```

<!-- x-release-please-end -->

**midnight-smoker** is compatible with npm and yarn workspaces. Probably.

## Deets

### Automated Checks

By default, **midnight-smoker** will run a suite of static checks against each installed package (akin to what ESLint does):

- `no-banned-files`: Asserts no sensitive files get published--things like private keys and other naughty secrets; supports custom filenames
- `no-missing-entry-point`: Asserts that a CJS package has a "traditional" entry point (`main` is defined and points to an existing file _or_ one of `index.js`, `index.json` or `index.node` exists);
- `no-missing-exports`: Asserts that the `exports` field, if present, points to an existing file or files; checks conditional exports for proper file types (ESM, CJS, or `.d.ts` in the case of `types`); asserts the `default` conditional export, if present, is _last_ in the object; optionally disallows glob patterns in subpath exports
- `no-missing-pkg-files`: Asserts that a `bin` field--if present--refers to an existing file; supports custom fields

These can be disabled entirely via the `--no-checks` option, and further configured via the `rules` property of a [config file](#config-files).

### Custom Scripts

The [automated checks](#automated-checks) only perform static analysis; they won't run your code. You'll need to provide a custom script to do that.

Depending on your setup, one of the following should get you started. But also you should [read more](#waitwhat-should-my-custom-script-do) about what your custom script should do. And if you _really_ want to do some heavy lifting, see [the thing about adding dev tools](#bring-your-own-tools).

#### Single-Package Repos

Add two scripts to your `package.json`. The first script invokes `smoker`, and the second is what `smoker` will run:

```json
{
  "scripts": {
    "test:smoke": "smoker smoke",
    "smoke": "node ./some-script.js"
  }
}
```

#### Monorepos

Add a script to your **workspace root** `package.json`:

```json
{
  "scripts": {
    "test:smoke": "smoker --all smoke"
  }
}
```

The `--all` flag tells **midnight-smoker** to run the `smoke` script in all workspaces. For each workspace, add a `smoke` script, changing the behavior as needed:

```json
{
  "scripts": {
    "smoke": "node ./some-script.js"
  }
}
```

If the `smoke` script should only exist in _some_ of those workspaces, provide the `--loose` option (equivalent to `npm run`'s `--if-present`) and the missing scripts will be conveniently ignored.

#### Wait—What Should My Custom Script Do?

The bare minimum would be checking that the entry point can be run:

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

- _If your package distributes an executable_, you might want to run that instead, and give it some common arguments (assuming it depends on your entry point). _Or_ you could go BUCK WILD and run it a bunch of different ways.
- _If your package is lazy-loading its dependencies_--like if you have a `require()` or `await import()` within some function that isn't called at startup--you may need to do more work than this.
- If your package skulks around in `node_modules` or otherwise has a _special relationship_ with package management or module resolution, you really ought to consider [running against multiple package managers](#using-specific-package-managers).

#### Using Specific Package Managers

**midnight-smoker** supports running [custom scripts](#custom-scripts) against _multiple, specific_ package managers.

By default, **midnight-smoker** will use the latest version of `npm` to pack, install, and run the scripts. However, you can provide the `--pm` option to use a different package manager _or additional package managers._

Example:

```bash
# run the "smoke" script against the latest version of yarn@1.x.x,
# the latest npm and npm v6.14.18.
midnight-smoker --pm yarn@1 --pm npm@latest --pm npm@6.14.18 smoke
```

> [!NOTE]
> For the curious: **midnight-smoker** uses [`corepack`](https://github.com/nodejs/corepack) and supports the same versions as its `corepack` dependency. The strategy for consuming `corepack` may change in the future, if needed; ideally we could rely on the system `corepack` (since it ships with Node.js), but that's not currently possible.
>
> If present, the `packageManager` field in `package.json` will be ignored.

> [!WARNING]
> As of **midnight-smoker** v4.0.0, only `yarn` and `npm` are supported. `pnpm` support is planned for a future release.

#### Bring Your Own Tools

Wait, wait--I know this one. Let me guess--_you want to use a test runner_.

> [!WARNING]
> This is discouraged, as it breaks the "as a consumer would get your package" contract. It ~~doesn't~~ shouldn't, however, leak any of your tools' dependencies--limiting the blast radius.
>
> How much does that matter? You decide.

Provide the `--add <thing>` option to **midnight-smoker**, where `thing` is anything `npm install <thing>` could install:

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

If unspecified in `--add`, **midnight-smoker** will use the version of the dependency in your `package.json`'s `devDependencies`/`dependencies`/`optionalDependencies`/`peerDepedenencies` fields (in that order of preference).

If the tool isn't found in these fields, **midnight-smoker** will just pull down the `latest` tag of the dependency.

`--add` can be provided multiple times.

> [!NOTE]
> You should just add the thing to your `devDependencies` if it isn't there. That is smart. That is cool.

### Config Files

I know what you're thinking: "I just don't have enough config files!" **midnight-smoker** solves this problem by giving you the opportunity to add another one. Config files are supported via a `smoker` field in `package.json`, or one of:

- `.smokerrc.(json|js|cjs|mjs)`
- `smoker.config.(json|js|cjs|mjs)`
- `.config/smokerrc.(json|js|cjs|mjs)`
- `.config/smoker.config.(json|js|cjs|mjs)`

> [!NOTE]
> There's a [**JSON Schema**](/schema/midnight-smoker.schema.json) if you want it.

## Resources

- GitHub Action: [**node-js-production-test-action**](https://github.com/marketplace/actions/node-js-production-test-action)

  > It's probably a better idea to just add **midnight-smoker** as a dev dep and run it instead of using this action, since it may trail behind the latest version of **midnight-smoker**.

## Acknowledgements

- [ban-sensitive-files](https://github.com/bahmutov/ban-sensitive-files) for the file list
- [ESLint](https://eslint.org/) for the "rule" concept & config

## Notes

That song sucks.

## License

Copyright © 2022 [Christopher "boneskull" Hiller](https://github.com/boneskull). Licensed Apache-2.0
