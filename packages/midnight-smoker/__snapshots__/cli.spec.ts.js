exports['midnight-smoker [E2E] command-line interface option --help should show help text [snapshot] 1'] = `
smoker

Lint package artifacts

Commands:
  smoker lint                   Lint package artifacts                 [default]
  smoker list <component>       Show available components          [aliases: ls]
  smoker run-script <script..>  Run custom script(s) against package artifacts
                                                                  [aliases: run]

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

Maybe you should read the docs at: https://boneskull.github.io/midnight-smoker
`

exports['midnight-smoker [E2E] command-line interface command list reporters should list reporters [snapshot] 1'] = `
┌─────────┬───────────────────────────────────────┬────────────┐
│ Name    │ Description                           │ Plugin     │
├─────────┼───────────────────────────────────────┼────────────┤
│ console │ Default console reporter (for humans) │ (built-in) │
├─────────┼───────────────────────────────────────┼────────────┤
│ json    │ JSON reporter (for machines)          │ (built-in) │
└─────────┴───────────────────────────────────────┴────────────┘
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
┌─────────────┬────────────┬──────────────────┐
│ Name        │ Executable │ Accepts          │
├─────────────┼────────────┼──────────────────┤
│ Npm7        │ npm        │ ^7.0.0 || ^8.0.0 │
├─────────────┼────────────┼──────────────────┤
│ Npm9        │ npm        │ >=9.0.0          │
├─────────────┼────────────┼──────────────────┤
│ YarnClassic │ yarn       │ ^1.0.0           │
├─────────────┼────────────┼──────────────────┤
│ YarnBerry   │ yarn       │ >=2.0.0          │
└─────────────┴────────────┴──────────────────┘
`

exports['midnight-smoker [E2E] command-line interface command list plugins should list plugins [snapshot] 1'] = `
┌────────────┬─────────┬──────────────────────────────────────┬─────────────────────────────────┐
│ Name       │ Version │ Description                          │ Resolved                        │
├────────────┼─────────┼──────────────────────────────────────┼─────────────────────────────────┤
│ (built-in) │ 0.0.0   │ Default behavior for midnight-smoker │ ../plugin-default/dist/index.js │
└────────────┴─────────┴──────────────────────────────────────┴─────────────────────────────────┘
`
