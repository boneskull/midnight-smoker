exports[
  'midnight-smoker smoker CLI script single script when the script succeeds should produce expected output 1'
] = `
💨 midnight-smoker v<version>
- Packing current project...
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✔ Installed 1 unique package from tarball
- Running script 0/1...
✔ Successfully ran 1 script
✔ Lovey-dovey! 💖
`;

exports[
  'midnight-smoker smoker CLI script single script when the script fails should produce expected output 1'
] = `
💨 midnight-smoker v<version>
- Packing current project...
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✔ Installed 1 unique package from tarball
- Running script 0/1...
✖ 1 of 1 script failed

Error details for failed package fail:

(runScript) Script "smoke" in package "fail" failed: Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run smoke

> fail@1.0.0 smoke
> exit 1

✖ 🤮 Maurice!
`;

exports[
  'midnight-smoker smoker CLI script multiple scripts when the scripts succeed should produce expected output 1'
] = `
💨 midnight-smoker v<version>
- Packing current project...
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✔ Installed 1 unique package from tarball
- Running script 0/2...
✔ Successfully ran 2 scripts
✔ Lovey-dovey! 💖
`;

exports['midnight-smoker smoker CLI option --help should show help text 1'] = `
smoker <script> [scripts..]

Run tests against a package as it would be published

Positionals:
  script   Script in package.json to run                                [string]
  scripts  Additional script(s) to run                                  [string]

Behavior:
  --add           Additional dependency to provide to script(s)          [array]
  --all           Run script in all workspaces                         [boolean]
  --bail          When running scripts, halt on first error            [boolean]
  --include-root  Include the workspace root; must provide '--all'     [boolean]
  --json          Output JSON only                                     [boolean]
  --workspace     Run script in a specific workspace or workspaces       [array]
  --pm            Run script(s) with a specific package manager;
                  <npm|yarn|pnpm>[@version]      [array] [default: "npm@latest"]

Options:
  --version  Show version number                                       [boolean]
  --verbose  Verbose output                                            [boolean]
  --help     Show help                                                 [boolean]

For more info, see https://github.com/boneskull/midnight-smoker
`;

exports[
  'midnight-smoker smoker CLI option --json when the script succeeds should produce expected output 1'
] = `
{
  "failures": 0,
  "results": [
    {
      "pkgName": "single-script",
      "script": "smoke",
      "rawResult": {
        "command": "<path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run smoke",
        "escapedCommand": "\\"<path/to/>/bin/node\\" \\"<path/to/>/.bin/corepack\\" \\"npm@<version>\\" run smoke",
        "exitCode": 0,
        "stdout": "\\n> single-script@1.0.0 smoke\\n> exit 0\\n",
        "stderr": "",
        "failed": false,
        "timedOut": false,
        "isCanceled": false,
        "killed": false
      },
      "cwd": "<cwd>"
    }
  ],
  "manifest": {
    "npm@<version>": [
      {
        "packedPkg": {
          "tarballFilepath": "<tarball.tgz>",
          "installPath": "<some/path>",
          "pkgName": "single-script"
        },
        "script": "smoke"
      }
    ]
  },
  "total": 1,
  "executed": 1
}
`;

exports[
  'midnight-smoker smoker CLI option --json when the script fails should provide helpful result 1'
] = `
{
  "results": [
    {
      "pkgName": "fail",
      "script": "smoke",
      "error": {},
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
      "cwd": "<cwd>"
    }
  ],
  "manifest": {
    "npm@<version>": [
      {
        "packedPkg": {
          "tarballFilepath": "<tarball.tgz>",
          "installPath": "<some/path>",
          "pkgName": "fail"
        },
        "script": "smoke"
      }
    ]
  },
  "total": 1,
  "failures": 1,
  "executed": 1
}
`;
