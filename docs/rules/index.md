# Rule Reference

`midnight-smoker` contains a collection of automated checks for validating a _packed artifact_. A _packed artifact_ is the tarball (`.tgz`) created by `npm pack`, which is published to a registry.

## Caveats

- Unless otherwise noted, the default severity level for each rule is `Error`.

- _All_ options are _optional_.

## no-banned-files

**Ensures banned files do not exist in the packed artifact.**

`no-banned-files` uses a list of known sensitive files, and can be configured to allow or deny additional files.

### no-banned-files Options

| Name    | Type       | Default | Description                             |
| ------- | ---------- | ------- | --------------------------------------- |
| `allow` | `string[]` | `[]`    | A list of filenames to explicitly allow |
| `deny`  | `string[]` | `[]`    | A list of filenames to explicitly deny  |

### no-banned-files Notes

Portions adapted from [ban-sensitive-files](https://github.com/bahmutov/ban-sensitive-files), including `git-deny-patterns.json` and the `reToRegExp` function.

## no-missing-entry-point

**Ensures a CommonJS package has a resolvable entry point within the packed artifact.**

`no-missing-entry-point` checks the file specified in the `main` field. If the `main` field isn't present in `package.json`, the rule looks for these files in the root of the artifact, in order:

- `index.js`
- `index.json`
- `index.node`

This mimics [Node.js' behavior](https://nodejs.org/api/modules.html#all-together).

### no-missing-entry-point Options

(none)

## no-missing-pkg-files

**Ensures any files referenced in `package.json` exist in the packed artifact.**

### no-missing-pkg-files Options

| Name      | Type       | Default | Description                                                  |
| --------- | ---------- | ------- | ------------------------------------------------------------ |
| `bin`     | `boolean`  | `true`  | Check the file(s) referenced by the `bin` field, if present  |
| `browser` | `boolean`  | `true`  | Check the file referenced by the `browser` field, if present |
| `types`   | `boolean`  | `true`  | Check the file referenced by the `types` field, if present   |
| `unpkg`   | `boolean`  | `true`  | Check the file referenced by the `unpkg` field, if present   |
| `module`  | `boolean`  | `true`  | Check the file referenced by the `module` field, if present  |
| `fields`  | `string[]` | `[]`    | Check additional file(s) referenced by the given fields      |

## no-missing-exports

**Ensures all files referenced in the `exports` field exist in the packed artifact _and_ performs context-specific checks.**

`no-missing-exports` checks the `exports` field for missing files and weirdness in both CJS and ESM packages.

_All_ files and globs referenced are checked for existence in the packed artifact. Context-specific checks can be enabled with the below options.

### no-missing-exports Options

| Name      | Type      | Default | Description                                                                                  |
| --------- | --------- | ------- | -------------------------------------------------------------------------------------------- |
| `types`   | `boolean` | `true`  | Check the file referenced by the conditional `types` export has a `.d.ts` extension          |
| `require` | `boolean` | `true`  | Check the file referenced by the conditional `require` export references a CommonJS script   |
| `import`  | `boolean` | `true`  | Check the file referenced by the conditional `import` export references an ECMAScript module |
| `order`   | `boolean` | `true`  | Check the conditional `default` export is the _last_ field in its object                     |
| `glob`    | `boolean` | `true`  | If `false`, disallow glob patterns in the `exports` field                                    |

### no-missing-exports Notes

The context-specific checks should probably be in their own rule.
