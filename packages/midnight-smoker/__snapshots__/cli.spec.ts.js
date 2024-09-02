exports['midnight-smoker [E2E] command-line interface invalid usage when invalid command is provided should show help [snapshot] 1'] = `
smoker lint

Lint package artifacts

Commands:
  smoker lint                   Lint package artifacts                 [default]
  smoker list <component>       List available components          [aliases: ls]
  smoker run-script <script..>  Run custom script(s) against package artifacts
                                                                  [aliases: run]
  smoker view <item>            View information about stuff     [aliases: show]

Input:
      --all                Run in all workspaces                       [boolean]
      --allow-private      Do not ignore private packages              [boolean]
  -p, --pkg-manager, --pm  Use a specific package manager
                                                       [array] [default: (auto)]
  -w, --workspace          Run script in a specific workspace or workspaces
                                                                         [array]

Output:
      --json      Output JSON only. Alias for "--reporter=json"        [boolean]
  -r, --reporter  Reporter(s) to use                  [array] [default: console]
      --verbose   Enable verbose output                                [boolean]

Options:
      --version            Show version number                         [boolean]
  -c, --config             Path to config file                          [string]
  -P, --plugin, --plugins  Plugin(s) to use                              [array]
      --help               Show help                                   [boolean]

RTFM at: https://boneskull.github.io/midnight-smoker

Unknown argument: butts
`

exports['midnight-smoker [E2E] command-line interface invalid usage when positional is missing should show help [snapshot] 1'] = `
smoker run-script <script..>

Run custom script(s) against package artifacts

Positionals:
  script  Custom script(s) to run (from package.json)
                                                [array] [required] [default: []]

Input:
      --all                Run in all workspaces                       [boolean]
      --allow-private      Do not ignore private packages              [boolean]
  -p, --pkg-manager, --pm  Use a specific package manager
                                                       [array] [default: (auto)]
  -w, --workspace          Run script in a specific workspace or workspaces
                                                                         [array]

Output:
      --json      Output JSON only. Alias for "--reporter=json"        [boolean]
  -r, --reporter  Reporter(s) to use                  [array] [default: console]
      --verbose   Enable verbose output                                [boolean]

Script Behavior:
      --add                  Additional dependency to provide to script(s)
                                                                         [array]
      --bail, --fail-fast    Halt on first error                       [boolean]
      --lint                 Lint package artifacts after running script(s)
                                                       [boolean] [default: true]
      --loose, --if-present  Ignore missing scripts (use with workspaces)
                                                                       [boolean]

Options:
      --version            Show version number                         [boolean]
  -c, --config             Path to config file                          [string]
  -P, --plugin, --plugins  Plugin(s) to use                              [array]
      --help               Show help                                   [boolean]

Not enough non-option arguments: got 0, need at least 1
`

exports['midnight-smoker [E2E] command-line interface command list reporters should list reporters [snapshot] 1'] = `
┌──────────┬───────────────────────────────────────┬────────────┐
│ Name     │ Description                           │ Plugin     │
├──────────┼───────────────────────────────────────┼────────────┤
│ console  │ Default console reporter (for humans) │ (built-in) │
├──────────┼───────────────────────────────────────┼────────────┤
│ json     │ JSON reporter (for machines)          │ (built-in) │
├──────────┼───────────────────────────────────────┼────────────┤
│ progress │ Fancy progress bars (for humans)      │ (built-in) │
├──────────┼───────────────────────────────────────┼────────────┤
│ simple   │ Simple reporter (for non-TTY)         │ (built-in) │
└──────────┴───────────────────────────────────────┴────────────┘
`

exports['midnight-smoker [E2E] command-line interface command list rules should list rules [snapshot] 1'] = `
┌────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────┬────────────┬──────────────────────────────────────────────────────────────────────────┐
│ Name                   │ Description                                                                                              │ Plugin     │ URL                                                                      │
├────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────────────────────────────────┤
│ no-banned-files        │ Ensures banned files won't be published to the registry                                                  │ (built-in) │ https://boneskull.github.io/midnight-smoker/rules/no-banned-files        │
├────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────────────────────────────────┤
│ no-missing-entry-point │ Checks that the package contains an entry point; only applies to CJS packages without an "exports" field │ (built-in) │ https://boneskull.github.io/midnight-smoker/rules/no-missing-entry-point │
├────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────────────────────────────────┤
│ no-missing-exports     │ Checks that all files in the "exports" field (if present) exist                                          │ (built-in) │ https://boneskull.github.io/midnight-smoker/rules/no-missing-exports     │
├────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────┼──────────────────────────────────────────────────────────────────────────┤
│ no-missing-pkg-files   │ Checks that files referenced in package.json exist in the tarball                                        │ (built-in) │ https://boneskull.github.io/midnight-smoker/rules/no-missing-pkg-files   │
└────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────┴────────────┴──────────────────────────────────────────────────────────────────────────┘
`

exports['midnight-smoker [E2E] command-line interface command list pkg-managers should list package managers [snapshot] 1'] = `
┌──────────────┬────────────┬──────────────────┐
│ Name         │ Executable │ Accepts          │
├──────────────┼────────────┼──────────────────┤
│ npm7         │ npm        │ ^7.0.0 || ^8.0.0 │
├──────────────┼────────────┼──────────────────┤
│ npm9         │ npm        │ >=9.0.0          │
├──────────────┼────────────┼──────────────────┤
│ yarn-berry   │ yarn       │ >=2.0.0          │
├──────────────┼────────────┼──────────────────┤
│ yarn-classic │ yarn       │ ^1.0.0           │
└──────────────┴────────────┴──────────────────┘
`

exports['midnight-smoker [E2E] command-line interface command list plugins should list plugins [snapshot] 1'] = `
┌────────────┬─────────┬──────────────────────────────────────┬─────────────────────────────────┐
│ Name       │ Version │ Description                          │ Resolved                        │
├────────────┼─────────┼──────────────────────────────────────┼─────────────────────────────────┤
│ (built-in) │ 0.0.0   │ Default behavior for midnight-smoker │ ../plugin-default/dist/index.js │
└────────────┴─────────┴──────────────────────────────────────┴─────────────────────────────────┘
`

exports['midnight-smoker [E2E] command-line interface option --help should show help text [snapshot] 1'] = `
smoker

Lint package artifacts

Commands:
  smoker lint                   Lint package artifacts                 [default]
  smoker list <component>       List available components          [aliases: ls]
  smoker run-script <script..>  Run custom script(s) against package artifacts
                                                                  [aliases: run]
  smoker view <item>            View information about stuff     [aliases: show]

Input:
      --all                Run in all workspaces                       [boolean]
      --allow-private      Do not ignore private packages              [boolean]
  -p, --pkg-manager, --pm  Use a specific package manager
                                                       [array] [default: (auto)]
  -w, --workspace          Run script in a specific workspace or workspaces
                                                                         [array]

Output:
      --json      Output JSON only. Alias for "--reporter=json"        [boolean]
  -r, --reporter  Reporter(s) to use                  [array] [default: console]
      --verbose   Enable verbose output                                [boolean]

Options:
      --version            Show version number                         [boolean]
  -c, --config             Path to config file                          [string]
  -P, --plugin, --plugins  Plugin(s) to use                              [array]
      --help               Show help                                   [boolean]

RTFM at: https://boneskull.github.io/midnight-smoker
`
