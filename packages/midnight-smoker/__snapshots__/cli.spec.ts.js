exports['midnight-smoker [E2E] command-line interface option --help should show help text [snapshot] 1'] = `
smoker [scripts..]

Run tests against a package as it would be published

Commands:
  smoker [scripts..]     Run tests against a package as it would be published
                                                                       [default]
  smoker list-reporters  List available reporters
  smoker list-rules      List available rules

Positionals:
  scripts  Custom script(s) to run (from package.json)                  [string]

Behavior:
      --add                  Additional dependency to provide to script(s)
                                                                         [array]
      --all                  Run in all workspaces                     [boolean]
      --bail, --fail-fast    When running scripts, halt on first error [boolean]
      --include-root         Include the workspace root; must provide '--all'
                                                                       [boolean]
      --json                 Output JSON only. Alias for "--reporter=json"
                                                                       [boolean]
  -p, --pkg-manager, --pm    Use a specific package manager
                                                   [array] [default: npm@latest]
      --loose, --if-present  Ignore missing scripts (used with --all)  [boolean]
  -w, --workspace            Run script in a specific workspace or workspaces
                                                                         [array]
      --checks, --check      Run built-in checks       [boolean] [default: true]
  -r, --reporter             Reporter(s) to use       [array] [default: console]
  -P, --plugin, --plugins    Plugin(s) to use                            [array]

Options:
      --version  Show version number                                   [boolean]
      --help     Show help                                             [boolean]
      --verbose  Enable verbose output                [boolean] [default: false]

For more info, visit https://boneskull.github.io/midnight-smoker
`

exports['midnight-smoker [E2E] command-line interface command list-reporters should list reporters [snapshot] 1'] = `
┌─────────┬───────────────────────────────────────┬───────────┐
│ Name    │ Description                           │ Plugin    │
├─────────┼───────────────────────────────────────┼───────────┤
│ console │ Default console reporter (for humans) │ (builtin) │
├─────────┼───────────────────────────────────────┼───────────┤
│ json    │ JSON reporter (for machines)          │ (builtin) │
└─────────┴───────────────────────────────────────┴───────────┘
`

exports['midnight-smoker [E2E] command-line interface command list-rules should list rules [snapshot] 1'] = `
┌────────────────────────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────┬───────────┬──────────────────────────────────────────────────────────────────────────┐
│ Name                   │ Description                                                                                              │ Plugin    │ URL                                                                      │
├────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────┼──────────────────────────────────────────────────────────────────────────┤
│ no-banned-files        │ Ensures banned files won't be published to the registry                                                  │ (builtin) │ https://boneskull.github.io/midnight-smoker/rules/no-banned-files        │
├────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────┼──────────────────────────────────────────────────────────────────────────┤
│ no-missing-entry-point │ Checks that the package contains an entry point; only applies to CJS packages without an "exports" field │ (builtin) │ https://boneskull.github.io/midnight-smoker/rules/no-missing-entry-point │
├────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────┼──────────────────────────────────────────────────────────────────────────┤
│ no-missing-exports     │ Checks that all files in the "exports" field (if present) exist                                          │ (builtin) │ https://boneskull.github.io/midnight-smoker/rules/no-missing-exports     │
├────────────────────────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────┼───────────┼──────────────────────────────────────────────────────────────────────────┤
│ no-missing-pkg-files   │ Checks that files referenced in package.json exist in the tarball                                        │ (builtin) │ https://boneskull.github.io/midnight-smoker/rules/no-missing-pkg-files   │
└────────────────────────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────┴───────────┴──────────────────────────────────────────────────────────────────────────┘
`
