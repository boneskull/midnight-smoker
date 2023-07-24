# Changelog

## [3.0.2](https://github.com/boneskull/midnight-smoker/compare/v3.0.1...v3.0.2) (2023-07-24)


### Bug Fixes

* **ci:** fix broken node version in release action ([bb13b59](https://github.com/boneskull/midnight-smoker/commit/bb13b593560d0b72a67e119451e12956641e0295))

## [3.0.1](https://github.com/boneskull/midnight-smoker/compare/v3.0.0...v3.0.1) (2023-07-24)


### Bug Fixes

* **ci:** add missing step id ([0c721ff](https://github.com/boneskull/midnight-smoker/commit/0c721ffc5b8d49bf2e755a116f16272d29e71e5f))

## [3.0.0](https://github.com/boneskull/midnight-smoker/compare/v2.0.4...v3.0.0) (2023-07-24)


### ⚠ BREAKING CHANGES

* npm v9 changes `--global-style` to `--install-strategy=shallow`.  so now we need to retain the version that we found when running `which npm`, and change the shell command accordingly.  Note that even passing a custom path to `npm` will cause it to be executed so that we can verify the version.  This also modifies the `FIND_NPM_OK` event to return an `NpmInfo` object containing props `path` and `version`, instead of just the `string` path.
* This drops official support for Node.js v14.x, which is now at end-of-life.

### Bug Fixes

* suppress warning when using npm v9 ([a325ad4](https://github.com/boneskull/midnight-smoker/commit/a325ad407f452a1a77a09eb304e35a9471b44a05))


### Miscellaneous Chores

* drop Node.js v14.x support ([03f81be](https://github.com/boneskull/midnight-smoker/commit/03f81becc05cdf091fe8e56b273c1b3d9ed1a3b4))

## [2.0.4](https://github.com/boneskull/midnight-smoker/compare/v2.0.3...v2.0.4) (2023-05-19)


### Bug Fixes

* **deps:** update dependency which to v3.0.1 ([8b4b0f1](https://github.com/boneskull/midnight-smoker/commit/8b4b0f106887dfa4fbda9ea5c9103bb7fc311c4c))
* **deps:** update dependency yargs to v17.7.2 ([b4b86f8](https://github.com/boneskull/midnight-smoker/commit/b4b86f8afb03bddb0ec252a62c7661b0701b3519))

## [2.0.3](https://github.com/boneskull/midnight-smoker/compare/v2.0.2...v2.0.3) (2023-04-17)


### Bug Fixes

* **windows:** fix windows for real, hopefully ([7f7746c](https://github.com/boneskull/midnight-smoker/commit/7f7746c82792a6ccd49cc0754cef346d97e877a5))

## [2.0.2](https://github.com/boneskull/midnight-smoker/compare/v2.0.1...v2.0.2) (2023-04-17)


### Bug Fixes

* attempt to make it work in windows ([11bc003](https://github.com/boneskull/midnight-smoker/commit/11bc0033fa060bf8facdea2776c0eddf5eb6f320))
* **deps:** update dependency yargs to v17.7.0 ([1e7a964](https://github.com/boneskull/midnight-smoker/commit/1e7a9643cb7bf58d11a9ee5054bf2d66aa702346))
* **deps:** update dependency yargs to v17.7.1 ([5bae5e5](https://github.com/boneskull/midnight-smoker/commit/5bae5e502e3631561559dc8a427dc868a57f403e))

## [2.0.1](https://github.com/boneskull/midnight-smoker/compare/v2.0.0...v2.0.1) (2023-01-11)


### Bug Fixes

* npm audit ([dd1d430](https://github.com/boneskull/midnight-smoker/commit/dd1d430253c37c7d718b1c602b475e534d5c737f))
* use global style installs to avoid false positives ([2208856](https://github.com/boneskull/midnight-smoker/commit/2208856900dcc204db0285131d0f38d656387454))

## [2.0.0](https://github.com/boneskull/midnight-smoker/compare/v1.2.2...v2.0.0) (2022-12-05)


### ⚠ BREAKING CHANGES

* Now supports ^14.17.0 || ^16.13.0 || >=18.0.0 only!

### Bug Fixes

* **deps:** update dependency which to v3 ([b743420](https://github.com/boneskull/midnight-smoker/commit/b74342065771852ede8f4531448c04d1e49b47d1))


### Miscellaneous Chores

* drop support for Node.js &lt;= v14.17.0 ([5890e11](https://github.com/boneskull/midnight-smoker/commit/5890e11ddea1c0fda8ed8071a43e190e413cf056))

## [1.2.2](https://github.com/boneskull/midnight-smoker/compare/v1.2.1...v1.2.2) (2022-11-18)


### Bug Fixes

* **deps:** update dependency yargs to v17.6.0 ([1fb217e](https://github.com/boneskull/midnight-smoker/commit/1fb217e2e72c05f7d38e82f43dcc159857a00ff3))

## [1.2.1](https://github.com/boneskull/midnight-smoker/compare/v1.1.2...v1.2.1) (2022-10-27)


### Features

* add json output option ([0b5b9e3](https://github.com/boneskull/midnight-smoker/commit/0b5b9e374b56da9ca3e5e2233c05fc2688308a77))
* nice CLI ([717ad33](https://github.com/boneskull/midnight-smoker/commit/717ad33ffd481f78d6d112e02d7c79d5993676c7))


### Bug Fixes

* **cli:** handle non-Error errors better ([00a094e](https://github.com/boneskull/midnight-smoker/commit/00a094e62cf8ee6bcb4642812573143f183a862e))
* **README:** reasonable readme ([842e54e](https://github.com/boneskull/midnight-smoker/commit/842e54e1abc741da0b1722a94a9f49fbdd06457e))
* **types:** fix path to typings ([d02ad15](https://github.com/boneskull/midnight-smoker/commit/d02ad15bdf329839031475a0dcf850b234d04585))
* **types:** fix static types ([9c2acb5](https://github.com/boneskull/midnight-smoker/commit/9c2acb51d57a79a7a2884620787330b67ca05b82))
* **types:** include necessary types ([1cfb550](https://github.com/boneskull/midnight-smoker/commit/1cfb550d28b7d13fd27cb089c7dfe1d2dab8bce5))


### Miscellaneous Chores

* **main:** release v1.2.1 ([1cd8fba](https://github.com/boneskull/midnight-smoker/commit/1cd8fbabd45033b8a15e931f7c8aa5311507ae52))

## [1.1.2](https://github.com/boneskull/midnight-smoker/compare/v1.1.1...v1.1.2) (2022-10-18)


### Bug Fixes

* **cli:** handle non-Error errors better ([00a094e](https://github.com/boneskull/midnight-smoker/commit/00a094e62cf8ee6bcb4642812573143f183a862e))

## [1.1.1](https://github.com/boneskull/midnight-smoker/compare/v1.1.0...v1.1.1) (2022-08-05)


### Bug Fixes

* **types:** include necessary types ([1cfb550](https://github.com/boneskull/midnight-smoker/commit/1cfb550d28b7d13fd27cb089c7dfe1d2dab8bce5))

## [1.1.0](https://github.com/boneskull/midnight-smoker/compare/v1.0.1...v1.1.0) (2022-08-05)


### Features

* add json output option ([0b5b9e3](https://github.com/boneskull/midnight-smoker/commit/0b5b9e374b56da9ca3e5e2233c05fc2688308a77))


### Bug Fixes

* **types:** fix path to typings ([d02ad15](https://github.com/boneskull/midnight-smoker/commit/d02ad15bdf329839031475a0dcf850b234d04585))
* **types:** fix static types ([9c2acb5](https://github.com/boneskull/midnight-smoker/commit/9c2acb51d57a79a7a2884620787330b67ca05b82))

## [1.0.1](https://github.com/boneskull/midnight-smoker/compare/v1.0.0...v1.0.1) (2022-07-23)


### Bug Fixes

* **README:** reasonable readme ([842e54e](https://github.com/boneskull/midnight-smoker/commit/842e54e1abc741da0b1722a94a9f49fbdd06457e))

## 1.0.0 (2022-07-23)


### Features

* nice CLI ([717ad33](https://github.com/boneskull/midnight-smoker/commit/717ad33ffd481f78d6d112e02d7c79d5993676c7))
