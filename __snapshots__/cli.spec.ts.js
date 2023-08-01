exports['midnight-smoker CLI flag --help should show help text 1'] = {
  "stdout": "smoker <script> [scripts..]\n\nRun tests against a package as it would be published\n\nPositionals:\n  script                                                                [string]\n  scripts                                                               [string]\n\nBehavior:\n  --add           Additional dependency to provide to smoke tests        [array]\n  --workspace     One or more npm workspaces to test                     [array]\n  --all           Test all workspaces                                  [boolean]\n  --include-root  Include the workspace root; must provide '--all'     [boolean]\n  --install-args  Extra arguments to pass to `npm install`               [array]\n  --dir           Working directory to use      [string] [default: new temp dir]\n  --force         Overwrite working directory if it exists             [boolean]\n  --clean         Truncate working directory; must provide '--force'   [boolean]\n  --npm           Path to `npm` executable     [string] [default: `npm` in PATH]\n  --verbose       Print output from npm                                [boolean]\n  --bail          When running scripts, halt on first error            [boolean]\n  --json          Output JSON only                                     [boolean]\n\nOptions:\n  --version  Show version number                                       [boolean]\n  --help     Show help                                                 [boolean]\n\nFor more info, see https://github.com/boneskull/midnight-smoker",
  "stderr": "",
  "exitCode": 0
}

exports['midnight-smoker CLI flag --json when the test fails should provide helpful result 1'] = `
{
  "results": [
    {
      "pkgName": "fail",
      "script": "smoke",
      "error": {},
      "rawResult": {
        "shortMessage": "Command failed with exit code 1: <path/to/>/bin/node <path/to/>/bin/npm run-script smoke",
        "command": <path/to/>/bin/node <path/to/>/bin/npm run-script smoke",
        "escapedCommand": <path/to/>/bin/node\\" <path/to/>/bin/npm\\" run-script smoke",
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
  "scripts": [
    "smoke"
  ],
  "total": 1,
  "failures": 1,
  "executed": 1
}
`

exports['midnight-smoker CLI flag when the test passes should produce expected output 1'] = `
💨 midnight-smoker v3.0.4
- Packing current project...
✔ Packed 1 package
- Installing from 1 tarball...
✔ Installed 1 package from tarball
- Running script 0/1...
✔ Successfully ran 1 script
✔ Lovey-dovey! 💖
`

exports['midnight-smoker CLI flag when the test fails should produce expected output 1'] = `
💨 midnight-smoker v3.0.4
- Packing current project...
✔ Packed 1 package
- Installing from 1 tarball...
✔ Installed 1 package from tarball
- Running script 0/1...
✖ 1 of 1 script failed

Error details for failed package fail:

(runScript) Script "smoke" in package "fail" failed: Command failed with exit code 1: /home/boneskull/.nvm/versions/node/v20.5.0/bin/node /home/boneskull/.nvm/versions/node/v20.5.0/bin/npm run-script smoke

> fail@1.0.0 smoke
> exit 1

✖ 🤮 Maurice!
`

exports['midnight-smoker CLI flag --json when the test passes should produce expected output 1'] = `
{
  "results": [
    {
      "pkgName": "midnight-smoker",
      "script": "smoke:js",
      "rawResult": {
        "command": <path/to/>/bin/node <path/to/>/bin/npm run-script smoke:js",
        "escapedCommand": <path/to/>/bin/node\\" <path/to/>/bin/npm\\" run-script \\"smoke:js\\"",
        "exitCode": 0,
        "stdout": "\\n> midnight-smoker@<version> smoke:js\\n> <path/to/>smoker.js --version\\n\\n<version>",
        "stderr": "",
        "failed": false,
        "timedOut": false,
        "isCanceled": false,
        "killed": false
      },
      "cwd": "<cwd>"
    }
  ],
  "total": 1,
  "executed": 1,
  "scripts": [
    "smoke:js"
  ]
}
`
