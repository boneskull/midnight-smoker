exports['midnight-smoker smoker CLI script single script when the script succeeds should produce expected output [snapshot] 1'] = `
💨 midnight-smoker v<version>
- Packing current project…
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✔ Installed 1 unique package from tarball
- Running script 0/1…
✔ Successfully ran 1 script
✔ Lovey-dovey! 💖
`

exports['midnight-smoker smoker CLI script single script when the script fails should produce expected output [snapshot] 1'] = `
💨 midnight-smoker v<version>
- Packing current project…
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✔ Installed 1 unique package from tarball
- Running script 0/1…
✖ 1 of 1 script failed
ℹ Script failure details for package "fail":
» Script "smoke" in package "fail" failed: Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run smoke

> fail@1.0.0 smoke
> exit 1


✖ 🤮 Maurice!
`

exports['midnight-smoker smoker CLI script multiple scripts when the scripts succeed should produce expected output [snapshot] 1'] = `
💨 midnight-smoker v<version>
- Packing current project…
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✔ Installed 1 unique package from tarball
- Running script 0/2…
✔ Successfully ran 2 scripts
✔ Lovey-dovey! 💖
`

exports['midnight-smoker smoker CLI option --help should show help text [snapshot] 1'] = `
smoker [scripts..]

Run tests against a package as it would be published

Positionals:
  scripts  Script(s) in package.json to run                             [string]

Behavior:
  --add           Additional dependency to provide to script(s)          [array]
  --all           Run script in all workspaces                         [boolean]
  --bail          When running scripts, halt on first error            [boolean]
  --include-root  Include the workspace root; must provide '--all'     [boolean]
  --json          Output JSON only                                     [boolean]
  --pm            Run script(s) with a specific package manager;
                  <npm|yarn|pnpm>[@version]    [array] [default: ["npm@latest"]]
  --loose         Ignore missing scripts (used with --all)             [boolean]
  --workspace     Run script in a specific workspace or workspaces       [array]
  --checks        Run built-in checks                                  [boolean]

Options:
  --version  Show version number                                       [boolean]
  --verbose  Verbose output                                            [boolean]
  --help     Show help                                                 [boolean]

For more info, see https://github.com/boneskull/midnight-smoker
`

exports['midnight-smoker smoker CLI option --json when the script succeeds should produce expected script output [snapshot] 1'] = {
  "scripts": [
    {
      "pkgName": "single-script",
      "script": "smoke",
      "rawResult": {
        "command": "<path/to/>/bin/node <path/to/>/.bin/corepack npm@9.8.1 run smoke",
        "escapedCommand": "\"<path/to/>/bin/node\" \"<path/to/>/.bin/corepack\" \"npm@9.8.1\" run smoke",
        "exitCode": 0,
        "stdout": "\n> single-script@1.0.0 smoke\n> exit 0\n",
        "stderr": "",
        "failed": false,
        "timedOut": false,
        "isCanceled": false,
        "killed": false
      },
      "cwd": "<cwd>"
    }
  ],
  "checks": {
    "failed": [],
    "passed": [
      {
        "rule": {
          "name": "no-missing-pkg-files",
          "description": "Checks that files referenced in package.json exist in the tarball"
        },
        "context": {
          "pkgJson": "<some/path>",
          "pkg": "<some/path>",
          "severity": "error"
        },
        "failed": false
      },
      {
        "rule": {
          "name": "no-banned-files",
          "description": "Bans certain files from being published"
        },
        "context": {
          "pkgJson": "<some/path>",
          "pkg": "<some/path>",
          "severity": "error"
        },
        "failed": false
      },
      {
        "rule": {
          "name": "no-missing-entry-point",
          "description": "Checks that the package contains an entry point; only applies to CJS packages without an \"exports\" field"
        },
        "context": {
          "pkgJson": "<some/path>",
          "pkg": "<some/path>",
          "severity": "error"
        },
        "failed": false
      },
      {
        "rule": {
          "name": "no-missing-exports",
          "description": "Checks that all files in the \"exports\" field (if present) exist"
        },
        "context": {
          "pkgJson": "<some/path>",
          "pkg": "<some/path>",
          "severity": "error"
        },
        "failed": false
      }
    ]
  },
  "opts": {
    "add": [],
    "all": false,
    "bail": false,
    "includeRoot": false,
    "json": true,
    "linger": false,
    "verbose": false,
    "workspace": [],
    "pm": [
      "npm@latest"
    ],
    "script": [
      "smoke"
    ],
    "scripts": [
      "smoke"
    ],
    "loose": false,
    "checks": true,
    "rules": {
      "no-banned-files": {
        "severity": "error",
        "opts": {
          "allow": [],
          "deny": []
        }
      },
      "no-missing-pkg-files": {
        "severity": "error",
        "opts": {
          "bin": true,
          "browser": true,
          "types": true,
          "unpkg": true,
          "module": true,
          "fields": [
            "bin",
            "browser",
            "types",
            "unpkg",
            "module"
          ]
        }
      },
      "no-missing-entry-point": {
        "severity": "error",
        "opts": {}
      },
      "no-missing-exports": {
        "severity": "error",
        "opts": {
          "types": true,
          "require": true,
          "import": true,
          "order": true,
          "glob": true
        }
      }
    }
  }
}

exports['midnight-smoker smoker CLI option --json when the script fails should provide helpful result [snapshot] 1'] = `
{
  "results": {
    "scripts": [
      {
        "pkgName": "fail",
        "script": "smoke",
        "rawResult": {
          "shortMessage": "Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run smoke",
          "command": "<path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run smoke",
          "escapedCommand": "\\"<path/to/>/bin/node\\" \\"<path/to/>/.bin/corepack\\" \\"npm@<version>\\" run smoke",
          "exitCode": 1,
          "stdout": "\\n> fail@1.0.0 smoke\\n> exit 1\\n",
          "stderr": "",
          "failed": true,
          "timedOut": false,
          "isCanceled": false,
          "killed": false
        },
        "cwd": "<cwd>",
        "error": {
          "message": "Script \\"smoke\\" in package \\"fail\\" failed",
          "name": "Error",
          "stack": "Error: Script \\"smoke\\" in package \\"fail\\" failed\\n    at Npm7.runScript (<path/to/file>:<line>:<col>)\\n    at processTicksAndRejections (<path/to/file>:<line>:<col>)\\n    at Smoker.runScripts (<path/to/file>:<line>:<col>)\\n    at Smoker.smoke (<path/to/file>:<line>:<col>)\\n    at Object.handler (<path/to/file>:<line>:<col>)",
          "cause": {
            "script": "smoke",
            "pkgName": "fail",
            "pm": "npm",
            "error": {
              "shortMessage": "Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run smoke",
              "command": "<path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run smoke",
              "escapedCommand": "\\"<path/to/>/bin/node\\" \\"<path/to/>/.bin/corepack\\" \\"npm@<version>\\" run smoke",
              "exitCode": 1,
              "stdout": "\\n> fail@1.0.0 smoke\\n> exit 1\\n",
              "stderr": "",
              "failed": true,
              "timedOut": false,
              "isCanceled": false,
              "killed": false
            },
            "exitCode": 1,
            "output": ""
          },
          "code": "ESMOKER_RUNSCRIPT"
        }
      }
    ],
    "checks": {
      "passed": [],
      "failed": []
    },
    "opts": {
      "add": [],
      "all": false,
      "bail": false,
      "includeRoot": false,
      "json": true,
      "linger": false,
      "verbose": false,
      "workspace": [],
      "pm": [
        "npm@latest"
      ],
      "script": [
        "smoke"
      ],
      "scripts": [
        "smoke"
      ],
      "loose": false,
      "checks": false,
      "rules": {
        "no-banned-files": {
          "severity": "error",
          "opts": {
            "allow": [],
            "deny": []
          }
        },
        "no-missing-pkg-files": {
          "severity": "error",
          "opts": {
            "bin": true,
            "browser": true,
            "types": true,
            "unpkg": true,
            "module": true,
            "fields": []
          }
        },
        "no-missing-entry-point": {
          "severity": "error",
          "opts": {}
        },
        "no-missing-exports": {
          "severity": "error",
          "opts": {
            "types": true,
            "require": true,
            "import": true,
            "order": true,
            "glob": true
          }
        }
      }
    }
  },
  "stats": {
    "totalPackages": 1,
    "totalPackageManagers": 1,
    "totalScripts": 1,
    "failedScripts": 1,
    "passedScripts": 0,
    "totalChecks": null,
    "failedChecks": null,
    "passedChecks": null
  }
}
`

exports['midnight-smoker smoker CLI check when a check fails when the rule severity is "error" should produce expected output [snapshot] 1'] = `
💨 midnight-smoker v<version>
- Packing current project…
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✔ Installed 1 unique package from tarball
- Running 0/4 checks…
✖ 1 check of 4 failed
ℹ Check failures in package check-error:
» ✖ Banned file found: id_rsa (Private SSH key)

✖ 🤮 Maurice!
`

exports['midnight-smoker smoker CLI check when a check fails when the rule severity is "warn" should produce expected output [snapshot] 1'] = `
💨 midnight-smoker v<version>
- Packing current project…
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✔ Installed 1 unique package from tarball
- Running 0/4 checks…
✖ 1 check of 4 failed
ℹ Check failures in package check-warn:
» ⚠ Banned file found: id_rsa (Private SSH key)

✔ Lovey-dovey! 💖
`

exports['midnight-smoker smoker CLI check when a check fails when the rule severity is "off" should produce expected output [snapshot] 1'] = `
💨 midnight-smoker v<version>
- Packing current project…
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✔ Installed 1 unique package from tarball
- Running 0/3 checks…
✔ Successfully ran 3 checks
✔ Lovey-dovey! 💖
`

exports['midnight-smoker smoker CLI when packing fails should provide a reason [snapshot] 1'] = `
💨 midnight-smoker v<version>
- Packing current project…
✖ Failed while packing!

Package manager "npm" failed to pack:

Invalid package, must have name and version
(use --verbose for more details)
`

exports['midnight-smoker smoker CLI when packing fails when in verbose mode should provide more detail [snapshot] 1'] = `
💨 midnight-smoker v<version>
- Packing current project…
✖ Failed while packing!

PackError: Package manager "npm" failed to pack:

Invalid package, must have name and version
    at Npm7.pack (<path/to/file>:<line>:<col>)
    at processTicksAndRejections (<path/to/file>:<line>:<col>)
    at Smoker.pack (<path/to/file>:<line>:<col>)
    at Smoker.smoke (<path/to/file>:<line>:<col>)
    at Object.handler (<path/to/file>:<line>:<col>) {
  code: 'ESMOKER_PACK',
  [cause]: {
    pm: 'npm',
    error: Error: Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> pack --json --pack-destination=<path/to/dir> --foreground-scripts=false
    npm ERR! Invalid package, must have name and version
    
    npm ERR! A complete log of this run can be found in: <path/to/some>.log
    {
      "error": {
        "code": null,
        "summary": "Invalid package, must have name and version",
        "detail": ""
      }
    }
        at makeError (<path/to/file>:<line>:<col>)
        at handlePromise (<path/to/file>:<line>:<col>)
        at processTicksAndRejections (<path/to/file>:<line>:<col>)
        at CorepackExecutor.exec (<path/to/file>:<line>:<col>)
        at Npm7.pack (<path/to/file>:<line>:<col>)
        at Smoker.pack (<path/to/file>:<line>:<col>)
        at Smoker.smoke (<path/to/file>:<line>:<col>)
        at Object.handler (<path/to/file>:<line>:<col>) {
      shortMessage: 'Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> pack --json --pack-destination=<path/to/dir> --foreground-scripts=false',
      command: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> pack --json --pack-destination=<path/to/dir> --foreground-scripts=false',
      escapedCommand: '"<path/to/>/bin/node" "<path/to/>/.bin/corepack" "npm@<version>" pack --json "--pack-destination=<path/to/dir> "--foreground-scripts=false"',
      exitCode: 1,
      signal: undefined,
      signalDescription: undefined,
      stdout: '{\\n' +
        '  "error": {\\n' +
        '    "code": null,\\n' +
        '    "summary": "Invalid package, must have name and version",\\n' +
        '    "detail": ""\\n' +
        '  }\\n' +
        '}',
      stderr: 'npm ERR! Invalid package, must have name and version\\n' +
        '\\n' +
        'npm ERR! A complete log of this run can be found in: <path/to/some>.log',
      failed: true,
      timedOut: false,
      isCanceled: false,
      killed: false
    },
    output: 'npm ERR! Invalid package, must have name and version\\n' +
      '\\n' +
      'npm ERR! A complete log of this run can be found in: <path/to/some>.log'
  }
}
`

exports['midnight-smoker smoker CLI when installation fails should provide a reason [snapshot] 1'] = `
💨 midnight-smoker v<version>
- Packing current project…
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✖ Failed while installing!

Package manager "npm" failed to install packages
(use --verbose for more details)
`

exports['midnight-smoker smoker CLI when installation fails when in verbose mode should provide more detail [snapshot] 1'] = `
💨 midnight-smoker v<version>
- Packing current project…
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✖ Failed while installing!

InstallError: Package manager "npm" failed to install packages
    at Npm7.install (<path/to/file>:<line>:<col>)
    at processTicksAndRejections (<path/to/file>:<line>:<col>)
    at Smoker.install (<path/to/file>:<line>:<col>)
    at Smoker.smoke (<path/to/file>:<line>:<col>)
    at Object.handler (<path/to/file>:<line>:<col>) {
  code: 'ESMOKER_INSTALL',
  [cause]: {
    pm: 'npm',
    error: Error: Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> install --no-package-lock --global-style <path/to/some>.tgz
    npm WARN config global-style This option has been deprecated in favor of \`--install-strategy=shallow\`
    npm ERR! code ERESOLVE
    npm ERR! ERESOLVE unable to resolve dependency tree
    npm ERR! 
    npm ERR! While resolving: undefined@undefined
    npm ERR! Found: install-error@1.0.0
    npm ERR! node_modules/install-error
    npm ERR!   <path/to/some>.tgz" from the root project
    npm ERR! 
    npm ERR! Could not resolve dependency:
    npm ERR! peer install-error@"2.0.0" from install-error@1.0.0
    npm ERR! node_modules/install-error
    npm ERR!   <path/to/some>.tgz" from the root project
    npm ERR! 
    npm ERR! Fix the upstream dependency conflict, or retry
    npm ERR! this command with --force or --legacy-peer-deps
    npm ERR! to accept an incorrect (and potentially broken) dependency resolution.
    npm ERR! 
    npm ERR! 
    npm ERR! For a full report see:
    npm ERR! <path/to/some>.txt
    
    npm ERR! A complete log of this run can be found in: <path/to/some>.log
        at makeError (<path/to/file>:<line>:<col>)
        at handlePromise (<path/to/file>:<line>:<col>)
        at processTicksAndRejections (<path/to/file>:<line>:<col>)
        at CorepackExecutor.exec (<path/to/file>:<line>:<col>)
        at Npm7.install (<path/to/file>:<line>:<col>)
        at Smoker.install (<path/to/file>:<line>:<col>)
        at Smoker.smoke (<path/to/file>:<line>:<col>)
        at Object.handler (<path/to/file>:<line>:<col>) {
      shortMessage: 'Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> install --no-package-lock --global-style <path/to/some>.tgz',
      command: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> install --no-package-lock --global-style <path/to/some>.tgz',
      escapedCommand: '"<path/to/>/bin/node" "<path/to/>/.bin/corepack" "npm@<version>" install --no-package-lock --global-style <path/to/some>.tgz"',
      exitCode: 1,
      signal: undefined,
      signalDescription: undefined,
      stdout: '',
      stderr: 'npm WARN config global-style This option has been deprecated in favor of \`--install-strategy=shallow\`\\n' +
        'npm ERR! code ERESOLVE\\n' +
        'npm ERR! ERESOLVE unable to resolve dependency tree\\n' +
        'npm ERR! \\n' +
        'npm ERR! While resolving: undefined@undefined\\n' +
        'npm ERR! Found: install-error@1.0.0\\n' +
        'npm ERR! node_modules/install-error\\n' +
        'npm ERR!   <path/to/some>.tgz" from the root project\\n' +
        'npm ERR! \\n' +
        'npm ERR! Could not resolve dependency:\\n' +
        'npm ERR! peer install-error@"2.0.0" from install-error@1.0.0\\n' +
        'npm ERR! node_modules/install-error\\n' +
        'npm ERR!   <path/to/some>.tgz" from the root project\\n' +
        'npm ERR! \\n' +
        'npm ERR! Fix the upstream dependency conflict, or retry\\n' +
        'npm ERR! this command with --force or --legacy-peer-deps\\n' +
        'npm ERR! to accept an incorrect (and potentially broken) dependency resolution.\\n' +
        'npm ERR! \\n' +
        'npm ERR! \\n' +
        'npm ERR! For a full report see:\\n' +
        'npm ERR! <path/to/some>.txt\\n' +
        '\\n' +
        'npm ERR! A complete log of this run can be found in: <path/to/some>.log',
      failed: true,
      timedOut: false,
      isCanceled: false,
      killed: false
    }
  }
}
`
