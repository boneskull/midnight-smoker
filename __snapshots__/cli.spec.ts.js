exports[
  'midnight-smoker smoker CLI script single script when the script succeeds should produce expected output [snapshot] 1'
] = `
💨 midnight-smoker v<version>
- Packing current project…
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✔ Installed 1 unique package from tarball
- Running script 0/1…
✔ Successfully ran 1 script
✔ Lovey-dovey! 💖
`;

exports[
  'midnight-smoker smoker CLI script single script when the script fails should produce expected output [snapshot] 1'
] = `
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
`;

exports[
  'midnight-smoker smoker CLI script multiple scripts when the scripts succeed should produce expected output [snapshot] 1'
] = `
💨 midnight-smoker v<version>
- Packing current project…
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✔ Installed 1 unique package from tarball
- Running script 0/2…
✔ Successfully ran 2 scripts
✔ Lovey-dovey! 💖
`;

exports[
  'midnight-smoker smoker CLI option --help should show help text [snapshot] 1'
] = `
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
                  <npm|yarn|pnpm>[@version]      [array] [default: "npm@latest"]
  --loose         Ignore missing scripts (used with --all)             [boolean]
  --workspace     Run script in a specific workspace or workspaces       [array]
  --checks        Run built-in checks                  [boolean] [default: true]

Options:
  --version  Show version number                                       [boolean]
  --verbose  Verbose output                                            [boolean]
  --help     Show help                                                 [boolean]

For more info, see https://github.com/boneskull/midnight-smoker
`;

exports[
  'midnight-smoker smoker CLI option --json when the script succeeds should produce expected script output [snapshot] 1'
] = {
  scripts: [
    {
      pkgName: 'single-script',
      script: 'smoke',
      rawResult: {
        command:
          '<path/to/>/bin/node <path/to/>/.bin/corepack npm@9.8.1 run smoke',
        escapedCommand:
          '"<path/to/>/bin/node" "<path/to/>/.bin/corepack" "npm@9.8.1" run smoke',
        exitCode: 0,
        stdout: '\n> single-script@1.0.0 smoke\n> exit 0\n',
        stderr: '',
        failed: false,
        timedOut: false,
        isCanceled: false,
        killed: false,
      },
      cwd: '<cwd>',
    },
  ],
  checks: {
    failed: [],
    passed: [
      {
        rule: {
          name: 'no-missing-pkg-files',
          description:
            'Checks that files referenced in package.json exist in the tarball',
        },
        context: {
          pkgJson: '<some/path>',
          pkg: '<some/path>',
          severity: 'error',
        },
        failed: false,
      },
      {
        rule: {
          name: 'no-banned-files',
          description: 'Bans certain files from being published',
        },
        context: {
          pkgJson: '<some/path>',
          pkg: '<some/path>',
          severity: 'error',
        },
        failed: false,
      },
      {
        rule: {
          name: 'no-missing-entry-point',
          description:
            'Checks that the package contains an entry point; only applies to CJS packages without an "exports" field',
        },
        context: {
          pkgJson: '<some/path>',
          pkg: '<some/path>',
          severity: 'error',
        },
        failed: false,
      },
      {
        rule: {
          name: 'no-missing-exports',
          description:
            'Checks that all files in the "exports" field (if present) exist',
        },
        context: {
          pkgJson: '<some/path>',
          pkg: '<some/path>',
          severity: 'error',
        },
        failed: false,
      },
    ],
  },
  opts: {
    _: [],
    json: true,
    scripts: ['smoke'],
    add: [],
    pm: ['npm@latest'],
    workspace: [],
    checks: true,
    $0: 'smoker',
    verbose: false,
  },
};

exports[
  'midnight-smoker smoker CLI option --json when the script fails should provide helpful result [snapshot] 1'
] = `
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
      "_": [],
      "json": true,
      "checks": false,
      "scripts": [
        "smoke"
      ],
      "add": [],
      "pm": [
        "npm@latest"
      ],
      "workspace": [],
      "$0": "smoker",
      "verbose": false
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
`;
