# Changelog

## [8.0.0](https://github.com/boneskull/midnight-smoker/compare/midnight-smoker-v7.0.4...midnight-smoker-v8.0.0) (2023-12-17)


### ⚠ BREAKING CHANGES

* Given a boatload of deps are dropping it, We have to drop it too.

### Bug Fixes

* **deps:** update dependency corepack to v0.21.0 ([6f401a4](https://github.com/boneskull/midnight-smoker/commit/6f401a421db64ca416257ad318a74a2fa9e13bca))
* **deps:** update dependency corepack to v0.22.0 ([c5fea52](https://github.com/boneskull/midnight-smoker/commit/c5fea527522f9bddfeec2f5c3179c3e0eb5407f3))
* **deps:** update dependency corepack to v0.23.0 ([d63576e](https://github.com/boneskull/midnight-smoker/commit/d63576ed4c8581350fd96d708d9216b2f4107af8))
* **deps:** update dependency lilconfig to v3 ([9c6737f](https://github.com/boneskull/midnight-smoker/commit/9c6737f394e2195d0f50c908befe7fcb634d9716))
* **deps:** update dependency zod to v3.22.4 ([eea3d68](https://github.com/boneskull/midnight-smoker/commit/eea3d687a7cad333e7f75476d94e64a0eeca0c5b))
* **deps:** update dependency zod-validation-error to v2 ([b3f5fa8](https://github.com/boneskull/midnight-smoker/commit/b3f5fa8d41207b2eb6389f55741af3024803b4dd))
* **deps:** update dependency zod-validation-error to v2.1.0 ([0e16699](https://github.com/boneskull/midnight-smoker/commit/0e166992f0fbd00e97d2d93810fe3de5abebc390))
* **midnight-smoker:** add overload for normalization to readPackageJson ([b4e781f](https://github.com/boneskull/midnight-smoker/commit/b4e781f37ecb11e119eb5ad5b9efa620141c1c02))
* **midnight-smoker:** fix missing 'cause' prop on errors ([dc3ac8f](https://github.com/boneskull/midnight-smoker/commit/dc3ac8f6536bacd7638ccd0ecfd0ccf32122dcae))
* **midnight-smoker:** fix npm9 load() function ([3d171ec](https://github.com/boneskull/midnight-smoker/commit/3d171ec0224dfaee6e7f7d37a280aca5a051f797)), closes [#401](https://github.com/boneskull/midnight-smoker/issues/401)
* **no-missing-exports:** correctly check the 'types' field ([eef4876](https://github.com/boneskull/midnight-smoker/commit/eef4876aec239ca594795da2295ea3f3b171286f))
* remove ErrorOptions reference ([4282e74](https://github.com/boneskull/midnight-smoker/commit/4282e743d61b9a5ce0b5c939a9538c6310ea36d3))


### Miscellaneous Chores

* drop Node.js v16 ([1bc5a7e](https://github.com/boneskull/midnight-smoker/commit/1bc5a7ec060f55211efa12adaf27ed92feaf3439))

## [7.0.3](https://github.com/boneskull/midnight-smoker/compare/v7.0.2...v7.0.3) (2023-09-26)

### Bug Fixes

- **deps:** update definitelytyped ([d66b6d6](https://github.com/boneskull/midnight-smoker/commit/d66b6d6476f81b29eb3091075f1637ee3bb8f883))
- **deps:** update dependency @types/semver to v7.5.2 ([c8bc0a1](https://github.com/boneskull/midnight-smoker/commit/c8bc0a12439f9e6480d64d6ff98f05c3d07d609d))
- **deps:** update dependency glob to v10.3.5 ([33b8869](https://github.com/boneskull/midnight-smoker/commit/33b88697e8708656e814adc1bb100d94b7d37581))
- **deps:** update dependency glob to v10.3.6 ([0d1d95c](https://github.com/boneskull/midnight-smoker/commit/0d1d95c1dde5186255cbe2298dae808d725f5425))
- **deps:** update dependency glob to v10.3.7 ([166a8c2](https://github.com/boneskull/midnight-smoker/commit/166a8c254de4852b3e9c6dbc0f0dcf24e33ef2ef))
- **deps:** update dependency glob to v10.3.9 ([71dbefa](https://github.com/boneskull/midnight-smoker/commit/71dbefad5fbd952a8e77d0c12a2c43c9d167cc08))

## [7.0.2](https://github.com/boneskull/midnight-smoker/compare/v7.0.1...v7.0.2) (2023-09-09)

### Bug Fixes

- **deps:** update dependency glob to v10.3.4 ([fd3a8af](https://github.com/boneskull/midnight-smoker/commit/fd3a8af9c000efc2b8fd8fa56fde5e46bcea1d2e))

## [7.0.1](https://github.com/boneskull/midnight-smoker/compare/v7.0.0...v7.0.1) (2023-08-30)

### Bug Fixes

- **errors:** better error output ([51b0002](https://github.com/boneskull/midnight-smoker/commit/51b000231cba2130bd95de2c79b6011ce2da60eb))
- **verbose:** fix verbose mode ([4afd125](https://github.com/boneskull/midnight-smoker/commit/4afd1254009eead6ef535ee2209336e1d4d06f8e))

## [7.0.0](https://github.com/boneskull/midnight-smoker/compare/v6.1.1...v7.0.0) (2023-08-29)

### ⚠ BREAKING CHANGES

- The `Smoker` class can no longer be instantiated directly; use `Smoker.init()`. The `verbose` option will now cause a fatal error to throw its exception to the terminal. Rule configuration is now `severity string`, `rule-specific options`, or a tuple of `[rule-specifc options, severity string]`. It can no longer be `[rule-specific options` nor `[severity string]`. The config file schema has changed to reflect this. Type `SmokeOptions` removed and is now the same type as `SmokerOptions`.

### Features

- **rules:** no-missing-pkg-files checks "unpkg" and "module" fields by default ([6df6087](https://github.com/boneskull/midnight-smoker/commit/6df6087d0b3f9ba573cf39ca3cfd03b68394b062))

### Bug Fixes

- **checks:** the "warn" severity is respected; closes [#333](https://github.com/boneskull/midnight-smoker/issues/333) ([faf6a91](https://github.com/boneskull/midnight-smoker/commit/faf6a9173b6eb28d710bf0e36198b5b8ed65b845))
- **deps:** update dependency @types/semver to v7.5.1 ([03277db](https://github.com/boneskull/midnight-smoker/commit/03277db3022c520d5ee636d6fce58da091dedb1b))
- **deps:** update dependency corepack to v0.20.0 ([7ef49b2](https://github.com/boneskull/midnight-smoker/commit/7ef49b2b5d20966cdc4b5b9e1c1dbb232a481170))
- **deps:** update dependency which to v4 ([b566df4](https://github.com/boneskull/midnight-smoker/commit/b566df4ccaf16052034463601b3d8cb636f25d92))

### Miscellaneous Chores

- consolidate option parsing ([faf6a91](https://github.com/boneskull/midnight-smoker/commit/faf6a9173b6eb28d710bf0e36198b5b8ed65b845))

## [6.1.1](https://github.com/boneskull/midnight-smoker/compare/v6.1.0...v6.1.1) (2023-08-25)

### Bug Fixes

- **rules:** no-banned-files ignores node_modules ([4eb6e5d](https://github.com/boneskull/midnight-smoker/commit/4eb6e5d3e19663b0d63551713939fc4a015a9bc0)), closes [#330](https://github.com/boneskull/midnight-smoker/issues/330)
- **rules:** no-missing-exports supports arrays ([6dc69c2](https://github.com/boneskull/midnight-smoker/commit/6dc69c27535dbd96501af763b72d8965fa04e9a7))

## [6.1.0](https://github.com/boneskull/midnight-smoker/compare/v6.0.0...v6.1.0) (2023-08-24)

### Features

- **rules:** no-missing-pkg-files checks browser and types fields ([2beb84f](https://github.com/boneskull/midnight-smoker/commit/2beb84fb9a929d2ff1e1848c684c07329c993e53)), closes [#304](https://github.com/boneskull/midnight-smoker/issues/304)

## [6.0.0](https://github.com/boneskull/midnight-smoker/compare/v5.1.0...v6.0.0) (2023-08-23)

### ⚠ BREAKING CHANGES

- `midnight-smoker` now runs a small suite of automated checks by default.

### Features

- add builtin checks ([26d3979](https://github.com/boneskull/midnight-smoker/commit/26d3979c07904580c6794f672b8c4aee3c12fd3a))

### Bug Fixes

- **deps:** update dependency zod to v3.22.2 ([4926a4e](https://github.com/boneskull/midnight-smoker/commit/4926a4ee439e3e663bcf8f3ae873275eb48191bd))

## [5.1.0](https://github.com/boneskull/midnight-smoker/compare/v5.0.0...v5.1.0) (2023-08-21)

### Features

- add --loose flag ([8a35799](https://github.com/boneskull/midnight-smoker/commit/8a35799192a8c40b5b3c6a6058df91dce57d6622)), closes [#257](https://github.com/boneskull/midnight-smoker/issues/257)

### Bug Fixes

- **yarn:** fix workspace-related problems ([8a35799](https://github.com/boneskull/midnight-smoker/commit/8a35799192a8c40b5b3c6a6058df91dce57d6622))

## [5.0.0](https://github.com/boneskull/midnight-smoker/compare/v4.0.0...v5.0.0) (2023-08-14)

### ⚠ BREAKING CHANGES

- This package now requires a minimum Node.js of v16.20.0.

### Bug Fixes

- **config:** fix weird config file handling ([#282](https://github.com/boneskull/midnight-smoker/issues/282)) ([83a0fac](https://github.com/boneskull/midnight-smoker/commit/83a0fac29c5bbda740e4d1a2939d48bac0450972))
- pin corepack version ([20a0a03](https://github.com/boneskull/midnight-smoker/commit/20a0a03bb7a1556146c0d043305b47afa01a9ddd))
- **types:** export `SmokerConfig` type ([83a0fac](https://github.com/boneskull/midnight-smoker/commit/83a0fac29c5bbda740e4d1a2939d48bac0450972))

## [4.0.0](https://github.com/boneskull/midnight-smoker/compare/v3.1.0...v4.0.0) (2023-08-11)

### ⚠ BREAKING CHANGES

- **package-managers:** The following CLI options have been removed:
  - `--npm`: replaced by `--pm` functionality; provide a version, not a path
  - `--install-args`: may be re-added later, but package managers accept different args, so this became a problem
  - `--dir`, `--clean`, and `--force`: package managers each have their own temp dir and we cannot share a dir between them
- **package-managers:** add ability to run tests against multiple arbitrary package managers

### Features

- **package-managers:** add ability to run tests against multiple arbitrary package managers ([ad94ad4](https://github.com/boneskull/midnight-smoker/commit/ad94ad4bb53567a572c83067ffed5f45ae6d9e28))
- **package-managers:** add datafiles and generation script ([42d2d7e](https://github.com/boneskull/midnight-smoker/commit/42d2d7e3bad9b3752970bd4450954fd020994e3c))
- **package-managers:** add package manager support ([16b391e](https://github.com/boneskull/midnight-smoker/commit/16b391e4af5e3ca87fa45aa9c6c760aa69350766))

## [3.1.0](https://github.com/boneskull/midnight-smoker/compare/v3.0.4...v3.1.0) (2023-08-09)

### Features

- new --add flag ([41b423c](https://github.com/boneskull/midnight-smoker/commit/41b423cc14cd8493347581a55c7efdc19d527b2f))

### Bug Fixes

- --json can now fail ([5df9d9c](https://github.com/boneskull/midnight-smoker/commit/5df9d9c6bdffafb8401b134c6f3efd6b73a40ef5))

## [3.0.4](https://github.com/boneskull/midnight-smoker/compare/v3.0.3...v3.0.4) (2023-07-25)

### Bug Fixes

- **ci:** force default registry ([1dcac87](https://github.com/boneskull/midnight-smoker/commit/1dcac8714049b0a9d6e5ee7d39a7db3eece43407))

## [3.0.3](https://github.com/boneskull/midnight-smoker/compare/v3.0.2...v3.0.3) (2023-07-24)

### Bug Fixes

- **ci:** skip npm upgrade step on release if no release ([41760a9](https://github.com/boneskull/midnight-smoker/commit/41760a99c5766366f517c1636d4bfb3ed6c4b01b))

## [3.0.2](https://github.com/boneskull/midnight-smoker/compare/v3.0.1...v3.0.2) (2023-07-24)

### Bug Fixes

- **ci:** fix broken node version in release action ([bb13b59](https://github.com/boneskull/midnight-smoker/commit/bb13b593560d0b72a67e119451e12956641e0295))

## [3.0.1](https://github.com/boneskull/midnight-smoker/compare/v3.0.0...v3.0.1) (2023-07-24)

### Bug Fixes

- **ci:** add missing step id ([0c721ff](https://github.com/boneskull/midnight-smoker/commit/0c721ffc5b8d49bf2e755a116f16272d29e71e5f))

## [3.0.0](https://github.com/boneskull/midnight-smoker/compare/v2.0.4...v3.0.0) (2023-07-24)

### ⚠ BREAKING CHANGES

- npm v9 changes `--global-style` to `--install-strategy=shallow`. so now we need to retain the version that we found when running `which npm`, and change the shell command accordingly. Note that even passing a custom path to `npm` will cause it to be executed so that we can verify the version. This also modifies the `FIND_NPM_OK` event to return an `NpmInfo` object containing props `path` and `version`, instead of just the `string` path.
- This drops official support for Node.js v14.x, which is now at end-of-life.

### Bug Fixes

- suppress warning when using npm v9 ([a325ad4](https://github.com/boneskull/midnight-smoker/commit/a325ad407f452a1a77a09eb304e35a9471b44a05))

### Miscellaneous Chores

- drop Node.js v14.x support ([03f81be](https://github.com/boneskull/midnight-smoker/commit/03f81becc05cdf091fe8e56b273c1b3d9ed1a3b4))

## [2.0.4](https://github.com/boneskull/midnight-smoker/compare/v2.0.3...v2.0.4) (2023-05-19)

### Bug Fixes

- **deps:** update dependency which to v3.0.1 ([8b4b0f1](https://github.com/boneskull/midnight-smoker/commit/8b4b0f106887dfa4fbda9ea5c9103bb7fc311c4c))
- **deps:** update dependency yargs to v17.7.2 ([b4b86f8](https://github.com/boneskull/midnight-smoker/commit/b4b86f8afb03bddb0ec252a62c7661b0701b3519))

## [2.0.3](https://github.com/boneskull/midnight-smoker/compare/v2.0.2...v2.0.3) (2023-04-17)

### Bug Fixes

- **windows:** fix windows for real, hopefully ([7f7746c](https://github.com/boneskull/midnight-smoker/commit/7f7746c82792a6ccd49cc0754cef346d97e877a5))

## [2.0.2](https://github.com/boneskull/midnight-smoker/compare/v2.0.1...v2.0.2) (2023-04-17)

### Bug Fixes

- attempt to make it work in windows ([11bc003](https://github.com/boneskull/midnight-smoker/commit/11bc0033fa060bf8facdea2776c0eddf5eb6f320))
- **deps:** update dependency yargs to v17.7.0 ([1e7a964](https://github.com/boneskull/midnight-smoker/commit/1e7a9643cb7bf58d11a9ee5054bf2d66aa702346))
- **deps:** update dependency yargs to v17.7.1 ([5bae5e5](https://github.com/boneskull/midnight-smoker/commit/5bae5e502e3631561559dc8a427dc868a57f403e))

## [2.0.1](https://github.com/boneskull/midnight-smoker/compare/v2.0.0...v2.0.1) (2023-01-11)

### Bug Fixes

- npm audit ([dd1d430](https://github.com/boneskull/midnight-smoker/commit/dd1d430253c37c7d718b1c602b475e534d5c737f))
- use global style installs to avoid false positives ([2208856](https://github.com/boneskull/midnight-smoker/commit/2208856900dcc204db0285131d0f38d656387454))

## [2.0.0](https://github.com/boneskull/midnight-smoker/compare/v1.2.2...v2.0.0) (2022-12-05)

### ⚠ BREAKING CHANGES

- Now supports ^14.17.0 || ^16.13.0 || >=18.0.0 only!

### Bug Fixes

- **deps:** update dependency which to v3 ([b743420](https://github.com/boneskull/midnight-smoker/commit/b74342065771852ede8f4531448c04d1e49b47d1))

### Miscellaneous Chores

- drop support for Node.js &lt;= v14.17.0 ([5890e11](https://github.com/boneskull/midnight-smoker/commit/5890e11ddea1c0fda8ed8071a43e190e413cf056))

## [1.2.2](https://github.com/boneskull/midnight-smoker/compare/v1.2.1...v1.2.2) (2022-11-18)

### Bug Fixes

- **deps:** update dependency yargs to v17.6.0 ([1fb217e](https://github.com/boneskull/midnight-smoker/commit/1fb217e2e72c05f7d38e82f43dcc159857a00ff3))

## [1.2.1](https://github.com/boneskull/midnight-smoker/compare/v1.1.2...v1.2.1) (2022-10-27)

### Features

- add json output option ([0b5b9e3](https://github.com/boneskull/midnight-smoker/commit/0b5b9e374b56da9ca3e5e2233c05fc2688308a77))
- nice CLI ([717ad33](https://github.com/boneskull/midnight-smoker/commit/717ad33ffd481f78d6d112e02d7c79d5993676c7))

### Bug Fixes

- **cli:** handle non-Error errors better ([00a094e](https://github.com/boneskull/midnight-smoker/commit/00a094e62cf8ee6bcb4642812573143f183a862e))
- **README:** reasonable readme ([842e54e](https://github.com/boneskull/midnight-smoker/commit/842e54e1abc741da0b1722a94a9f49fbdd06457e))
- **types:** fix path to typings ([d02ad15](https://github.com/boneskull/midnight-smoker/commit/d02ad15bdf329839031475a0dcf850b234d04585))
- **types:** fix static types ([9c2acb5](https://github.com/boneskull/midnight-smoker/commit/9c2acb51d57a79a7a2884620787330b67ca05b82))
- **types:** include necessary types ([1cfb550](https://github.com/boneskull/midnight-smoker/commit/1cfb550d28b7d13fd27cb089c7dfe1d2dab8bce5))

### Miscellaneous Chores

- **main:** release v1.2.1 ([1cd8fba](https://github.com/boneskull/midnight-smoker/commit/1cd8fbabd45033b8a15e931f7c8aa5311507ae52))

## [1.1.2](https://github.com/boneskull/midnight-smoker/compare/v1.1.1...v1.1.2) (2022-10-18)

### Bug Fixes

- **cli:** handle non-Error errors better ([00a094e](https://github.com/boneskull/midnight-smoker/commit/00a094e62cf8ee6bcb4642812573143f183a862e))

## [1.1.1](https://github.com/boneskull/midnight-smoker/compare/v1.1.0...v1.1.1) (2022-08-05)

### Bug Fixes

- **types:** include necessary types ([1cfb550](https://github.com/boneskull/midnight-smoker/commit/1cfb550d28b7d13fd27cb089c7dfe1d2dab8bce5))

## [1.1.0](https://github.com/boneskull/midnight-smoker/compare/v1.0.1...v1.1.0) (2022-08-05)

### Features

- add json output option ([0b5b9e3](https://github.com/boneskull/midnight-smoker/commit/0b5b9e374b56da9ca3e5e2233c05fc2688308a77))

### Bug Fixes

- **types:** fix path to typings ([d02ad15](https://github.com/boneskull/midnight-smoker/commit/d02ad15bdf329839031475a0dcf850b234d04585))
- **types:** fix static types ([9c2acb5](https://github.com/boneskull/midnight-smoker/commit/9c2acb51d57a79a7a2884620787330b67ca05b82))

## [1.0.1](https://github.com/boneskull/midnight-smoker/compare/v1.0.0...v1.0.1) (2022-07-23)

### Bug Fixes

- **README:** reasonable readme ([842e54e](https://github.com/boneskull/midnight-smoker/commit/842e54e1abc741da0b1722a94a9f49fbdd06457e))

## 1.0.0 (2022-07-23)

### Features

- nice CLI ([717ad33](https://github.com/boneskull/midnight-smoker/commit/717ad33ffd481f78d6d112e02d7c79d5993676c7))
