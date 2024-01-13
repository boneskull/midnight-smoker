exports['midnight-smoker [E2E] command-line interface invalid usage when invalid option is provided should show help 1'] = `
smoker lint

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
  -c, --config             Path to config file                          [string]
      --help               Show help                                   [boolean]

RTFM at: https://boneskull.github.io/midnight-smoker

Unknown argument: hlep
`

exports['midnight-smoker [E2E] command-line interface invalid usage when invalid command is provided should show help 1'] = `
smoker lint

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
  -c, --config             Path to config file                          [string]
      --help               Show help                                   [boolean]

RTFM at: https://boneskull.github.io/midnight-smoker

Unknown argument: butts
`

exports['midnight-smoker [E2E] command-line interface invalid usage when positional is missing should show help 1'] = `
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
      --loose, --if-present  Ignore missing scripts (use with workspaces)
                                                                       [boolean]

Options:
      --version            Show version number                         [boolean]
  -P, --plugin, --plugins  Plugin(s) to use                              [array]
  -c, --config             Path to config file                          [string]
      --help               Show help                                   [boolean]

Not enough non-option arguments: got 0, need at least 1
`
