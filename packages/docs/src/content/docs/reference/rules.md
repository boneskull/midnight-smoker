---
title: 'Built-in Rules'
description: Reference documentation for midnight-smoker's built-in rules
---

`midnight-smoker` contains a built-in collection of ["rules"](#rules) which together behave as a _linter_ for your to-be-published package.

## Concept: Severity

The _severity_ of a rule can be one of the following:

- `off`: The rule is disabled and _will not be run_
- `warn`: The rule is enabled, but _will not_ cause `smoker` to exit with a non-zero status code
- `error`: The rule is enabled, and _will_ cause `smoker` to exit with a non-zero status code

**The default severity level for each built-in rule is `error`.**

Rules provided by plugins _may_ override this behavior. Regardless, all rule severities can be overridden in a [config file](/reference/config).

## Rules

### `no-banned-files`

**Ensures banned files do not exist in the package artifact.**

`no-banned-files` uses a list of known sensitive files, and can be configured to allow or deny additional files.

#### `no-banned-files` Options

| Name    | Type       | Default | Description                             |
| ------- | ---------- | ------- | --------------------------------------- |
| `allow` | `string[]` | `[]`    | A list of filenames to explicitly allow |
| `deny`  | `string[]` | `[]`    | A list of filenames to explicitly deny  |

#### `no-banned-files` Notes

Portions adapted from [ban-sensitive-files](https://github.com/bahmutov/ban-sensitive-files), including `git-deny-patterns.json` and the `reToRegExp` function.

### `no-missing-entry-point`

**Ensures a CommonJS package has a resolvable entry point within the package artifact.**

`no-missing-entry-point` checks the file specified in the `main` field. If the `main` field isn't present in `package.json`, the rule looks for these files in the root of the artifact, in order:

- `index.js`
- `index.json`
- `index.node`

This mimics [Node.js' behavior](https://nodejs.org/api/modules.html#all-together).

#### `no-missing-entry-point` Options

(none)

### `no-missing-pkg-files`

**Ensures any files referenced in `package.json` exist in the package artifact.**

#### `no-missing-pkg-files` Options

| Name      | Type       | Default | Description                                                  |
| --------- | ---------- | ------- | ------------------------------------------------------------ |
| `bin`     | `boolean`  | `true`  | Check the file(s) referenced by the `bin` field, if present  |
| `browser` | `boolean`  | `true`  | Check the file referenced by the `browser` field, if present |
| `types`   | `boolean`  | `true`  | Check the file referenced by the `types` field, if present   |
| `unpkg`   | `boolean`  | `true`  | Check the file referenced by the `unpkg` field, if present   |
| `module`  | `boolean`  | `true`  | Check the file referenced by the `module` field, if present  |
| `fields`  | `string[]` | `[]`    | Check additional file(s) referenced by the given fields      |

### `no-missing-exports`

**Ensures all files referenced in the `exports` field exist in the package artifact _and_ performs context-specific checks.**

`no-missing-exports` checks the `exports` field for missing files and weirdness in both CJS and ESM packages.

_All_ files and globs referenced are checked for existence in the package artifact. Context-specific checks can be enabled with the below options.

#### `no-missing-exports` Options

| Name      | Type      | Default | Description                                                                                  |
| --------- | --------- | ------- | -------------------------------------------------------------------------------------------- |
| `types`   | `boolean` | `true`  | Check the file referenced by the conditional `types` export has a `.d.ts` extension          |
| `require` | `boolean` | `true`  | Check the file referenced by the conditional `require` export references a CommonJS script   |
| `import`  | `boolean` | `true`  | Check the file referenced by the conditional `import` export references an ECMAScript module |
| `order`   | `boolean` | `true`  | Check the conditional `default` export is the _last_ field in its object                     |
| `glob`    | `boolean` | `true`  | If `false`, disallow glob patterns in the `exports` field                                    |

#### `no-missing-exports` Notes

The context-specific checks should probably be in their own rule.

## Caveats

_All_ options are _optional_.
