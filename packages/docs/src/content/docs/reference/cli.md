---
title: The smoker CLI
description: midnight-smoker CLI reference
---

## Summary

**midnight-smoker**'s CLI is `smoker`.

_Not_ `midnight-smoker`. That is too long.

### Default Behavior

When executed without a command, `smoker`'s default behavior is to [`lint`](#command-lint).

### Global Options

These options are always available.

#### `--help`

Show the "help" and exit.

#### `--help` Example

```shell title='Help!!!'
smoker --help
```

#### `--version`

Print the version of `smoker` and exit.

#### `-P`, `--plugin`, `--plugins`

Load one or more plugins. The plugin must be a resolvable module identifier (e.g., `@boneskull/some-plugin`) or a path to a module.

This option may be provided multiple times.

:::tip[Use a Config File]

Specify the [`plugin` option](/reference/config#plugin) in a [config file](/reference/config) so you don't forget to type it every time.

:::

## Command: `lint`

The `lint` command will apply the set of [enabled rules](/reference/config) against your package artifact(s).

_Plugins may influence the available rules_.

:::tip[Again, Use a Config File]

If you want to disable a rule, change its severity to "warning", or otherwise set rule-specific options: do so in a [config file](/reference/config). See the [Built-in Rules Reference](/reference/rules) for rule-specific options.

Given the complexity of describing this sort of configuration, it's unsuitable for the command-line.

:::

### `lint` Summary

```text
smoker lint

Lint package artifacts

Input:
      --all                Run in all workspaces                       [boolean]
      --include-root       Include the workspace root; must provide '--all'
                                                                       [boolean]
  -w, --workspace          Run script in a specific workspace or workspaces
                                                                         [array]
  -p, --pkg-manager, --pm  Use a specific package manager
                                                   [array] [default: npm@latest]

Output:
      --json      Output JSON only. Alias for "--reporter=json"        [boolean]
  -r, --reporter  Reporter(s) to use                  [array] [default: console]
      --verbose   Enable verbose output               [boolean] [default: false]

Options:
      --version            Show version number                         [boolean]
  -P, --plugin, --plugins  Plugin(s) to use                              [array]
      --help               Show help                                   [boolean]

```

### `lint` Input Options

These options control which package(s) `midnight-smoker` will lint and with which package manager.

#### `--all`

Run `smoker` in all workspaces. If this option is not provided, `smoker` will run in the current workspace only. Has no effect if no workspaces are defined in the current project.

#### `--include-root`

Include the workspace root (monorepo root). **Must** be used with `--all`.

#### `-w`, `--workspace`

Run `smoker` in a specific workspace or workspaces. If this option is not provided, `smoker` will run in the current workspace only (which may be the workspace root). Has no effect if no workspaces are defined in the current project.

This option may be provided multiple times.

#### `-p`, `--pkg-manager`, `--pm`

Use a specific package manager. If this option is not provided, `smoker` will use the latest version of `npm`. The package manager must be of the form `<name>[@<version|dist-tag>]`, e.g. `yarn@berry`.

_Plugins may influence the available package managers_.

:::note

This option _may_ be provided multiple times, but this would only be useful if a package manager's "pack" behavior differs from that of `npm`. See the [Running Custom Scripts](/guides/custom-scripts.md) guide for a better use-case.

:::

### `lint` Output Options

#### `--json`

Output JSON only. Alias for `--reporter=json`.

If an exception occurs, the output will be a JSON object with an `error` property whose value is the exception object.

<!-- add links to definitions of possible JSON output types -->

#### `-r`, `--reporter`

Reporter(s) to use. If this option is not provided, `smoker` provides human-readable output via the `console` reporter.

_Plugins may influence the available reporters_.

To see the list of available reporters, see [`list-reporters`](#command-list-reporters).

#### `--verbose`

Enable verbose output. This will cause `smoker` to output additional information when it encounters an issue or error.

## Command: `list-reporters`

The `list-reporters` command will list the available reporters and exit.

Unless paired with [`--plugin`](#-p---plugin---plugins), will list built-in reporters only.

## Command: `list-rules`

The `list-rules` command will list the available rules (for use with [`lint`](#command-lint)) and exit.

Unless paired with [`--plugin`](#-p---plugin---plugins), will list built-in rules only.

<!-- ## Command: `list-pkg-managers` -->

## Command: `run-script`, `run`

The `run-script` command will run one or more custom scripts (defined in the [`scripts`](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#scripts) property of your `package.json`) against your package artifact(s).

### `run-script` Summary

```text
smoker run-script <script..>

Run custom script(s) against package artifacts

Positionals:
  script  Custom script(s) to run (from package.json)
                                                [array] [required] [default: []]

Input:
      --all                Run in all workspaces                       [boolean]
      --include-root       Include the workspace root; must provide '--all'
                                                                       [boolean]
  -w, --workspace          Run script in a specific workspace or workspaces
                                                                         [array]
  -p, --pkg-manager, --pm  Use a specific package manager
                                                   [array] [default: npm@latest]

Output:
      --json      Output JSON only. Alias for "--reporter=json"        [boolean]
  -r, --reporter  Reporter(s) to use                  [array] [default: console]
      --verbose   Enable verbose output               [boolean] [default: false]

Script Behavior:
      --add                  Additional dependency to provide to script(s)
                                                                         [array]
      --bail, --fail-fast    Halt on first error                       [boolean]
      --lint                 Lint package artifacts after running script(s)
                                                       [boolean] [default: true]
      --loose, --if-present  Ignore missing scripts (used with --all)  [boolean]

Options:
      --version            Show version number                         [boolean]
  -P, --plugin, --plugins  Plugin(s) to use                              [array]
      --help               Show help                                   [boolean]

```

:::note[DRY]

You'll notice that the ["Input"](#lint-input-options) and ["Output"](#lint-output-options) options are the same as those for [`lint`](#command-lint); as are [Global Options](#global-options).

Options specific to `run-script` are described below.

:::

### `run-script` Behavior Options

These options control how `smoker` will run your custom script(s).

#### `--add`

Additional dependency to provide to script(s). Each dependency provided this way will be installed--for each package manager specified--as if it were a "sibling" of the package artifact under test.

The value of this option may be [whatever your package manager(s) can install](https://docs.npmjs.com/cli/v10/commands/npm-install#description).

This option may be provided multiple times.

:::caution[Consider This]

It may be tempting to use your favorite test framework or some other tooling here, but doing so means that the testing environment will _not_ be the same as if a consumer installed it in isolation. While `midnight-smoker` takes measures to ensure that transitive dependencies from packages installed via `--add` do not get co-mingled with your installed artifact, it can make no guarantees. How important is this? Up to you.

_If it were me_, I'd probably pair `midnight-smoker` with a static analyzer like [`dependency-cruiser`](https://npm.im/dependency-cruiser) to make sure I've got my dependencies straight.

:::

#### `--bail`, `--fail-fast`

Halt on the first failed script.

If this option is not provided, `smoker` will continue to run scripts even if one or more fail.

`smoker` will still attempt to exit gracefully. Also: "fast" is relative.

#### `--no-lint` / `--lint=false`

**By default**, `smoker run-script` will run the [`lint`](#command-lint) command after custom script execution is complete.

To disable this behavior, provide `--no-lint` or `--lint=false`.

Best used when you only want to run custom scripts--especially against multiple package managers.

#### `--loose`, `--if-present`

Do not fail if a workspace's`package.json` does not contain the script(s) provided.

Only applicable when used with [`--all`](#--all) or [`--workspace`](#-w---workspace).

## Conventions

### Array-Type Options

Options which accept multiple values (e.g., [`--workspace`](-w---workspace)) may be provided multiple times. **They cannot be provided as comma-delimited values**.

:::tip[Use Short Aliases for Multiple Values]

It's convenient to use short options (`-w` instead of `--workspace`) when providing multiple values for options. Example:

```shell
smoker run -w=foo -w=bar -w=baz quux
```

:::

### Object-Type Options

Any option more complicated than an array of strings is **unsupported on the CLI** and must be provided via a [config file](/reference/config).

### Exit Codes

`smoker` will exit with code `0` if linting passes without an "error" severity issue and if all custom scripts exit with code `0`, and `1` otherwise.

`smoker` will exit with code `1` if packing or installation of any package fails.

## Further Reading

See the [CLI Guide](/guides/cli) for more in-depth recipes and examples.
