exports[
  'midnight-smoker smoker CLI script single script when the script succeeds should produce expected output 1'
] = `
💨 midnight-smoker v4.0.0
- Packing current project...
✔ Packed 1 unique package using npm@9.8.1…
- Installing 1 unique package from tarball using npm@9.8.1…
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
✔ Packed 1 unique package using npm@9.8.1…
- Installing 1 unique package from tarball using npm@9.8.1…
✔ Installed 1 unique package from tarball
- Running script 0/1...
✖ 1 of 1 script failed

Error details for failed package fail:

(runScript) Script "smoke" in package "fail" failed: Command failed with exit code 1: <path/to/>/bin/node <path/to/>/bin/corepack npm@9.8.1 run smoke

> fail@1.0.0 smoke
> exit 1

✖ 🤮 Maurice!
`;

exports[
  'midnight-smoker smoker CLI script multiple scripts when the scripts succeed should produce expected output 1'
] = `
💨 midnight-smoker v4.0.0
- Packing current project...
✔ Packed 1 unique package using npm@9.8.1…
- Installing 1 unique package from tarball using npm@9.8.1…
✔ Installed 1 unique package from tarball
- Running script 0/2...
✔ Successfully ran 2 scripts
✔ Lovey-dovey! 💖
`;

exports['midnight-smoker smoker CLI option --help should show help text 1'] = {
  stdout:
    'smoker <script> [scripts..]\n\nRun tests against a package as it would be published\n\nPositionals:\n  script                                                                [string]\n  scripts                                                               [string]\n\nBehavior:\n  --add           Additional dependency to provide to smoke tests        [array]\n  --all           Test all workspaces                                  [boolean]\n  --bail          When running scripts, halt on first error            [boolean]\n  --include-root  Include the workspace root; must provide \'--all\'     [boolean]\n  --json          Output JSON only                                     [boolean]\n  --verbose       Print output from npm                                [boolean]\n  --workspace     One or more npm workspaces to test                     [array]\n  --pm            Run script(s) with a specific package manager;\n                  <npm|yarn|pnpm>[@version]    [array] [default: ["npm@latest"]]\n\nOptions:\n  --version  Show version number                                       [boolean]\n  --help     Show help                                                 [boolean]\n\nFor more info, see https://github.com/boneskull/midnight-smoker',
  stderr: '',
  exitCode: 0,
};

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
        "command": "<path/to/>/bin/node <path/to/>/bin/corepack npm@9.8.1 run smoke",
        "escapedCommand": "\\"<path/to/>/bin/node\\" \\"<path/to/>/bin/corepack\\" \\"npm@9.8.1\\" run smoke",
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
    "npm@9.8.1": [
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
        "shortMessage": "Command failed with exit code 1: <path/to/>/bin/node <path/to/>/bin/corepack npm@9.8.1 run smoke",
        "command": "<path/to/>/bin/node <path/to/>/bin/corepack npm@9.8.1 run smoke",
        "escapedCommand": "\\"<path/to/>/bin/node\\" \\"<path/to/>/bin/corepack\\" \\"npm@9.8.1\\" run smoke",
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
    "npm@9.8.1": [
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
