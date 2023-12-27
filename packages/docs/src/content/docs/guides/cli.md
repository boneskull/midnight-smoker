---
title: Using the midnight-smoker CLI
description: How to use midnight-smoker's CLI
---

## Summary

```text
smoker [scripts..]

Smoke test & lint your package artifacts (instead of failing miserably)

Commands:
  smoker [scripts..]     Smoke test & lint your package artifacts (instead of
                         failing miserably)                            [default]
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

Maybe you should read the docs at: https://boneskull.github.io/midnight-smoker
```
