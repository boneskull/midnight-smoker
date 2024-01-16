exports['@midnight-smoker/plugin-default reporter json when the script succeeds should produce expected script output [snapshot] 1'] = {
  "results": {
    "opts": {
      "add": [],
      "all": false,
      "bail": false,
      "executor": "default",
      "include-root": false,
      "includeRoot": false,
      "json": true,
      "linger": false,
      "lint": false,
      "loose": false,
      "pkg-manager": [],
      "pkgManager": [],
      "plugin": [],
      "reporter": [
        "json"
      ],
      "rule-runner": "default",
      "ruleRunner": "default",
      "rules": {
        "no-banned-files": {
          "opts": {
            "allow": [],
            "deny": []
          },
          "severity": "error"
        },
        "no-missing-entry-point": {
          "opts": {},
          "severity": "error"
        },
        "no-missing-exports": {
          "opts": {
            "glob": true,
            "import": true,
            "order": true,
            "require": true,
            "types": true
          },
          "severity": "error"
        },
        "no-missing-pkg-files": {
          "opts": {
            "bin": true,
            "browser": true,
            "fields": [],
            "module": true,
            "types": true,
            "unpkg": true
          },
          "severity": "error"
        }
      },
      "script": [
        "smoke"
      ],
      "script-runner": "default",
      "scriptRunner": "default",
      "verbose": false,
      "workspace": []
    },
    "scripts": [
      {
        "cwd": "<cwd>",
        "pkgName": "single-script",
        "rawResult": {
          "command": "<path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run --json smoke",
          "escapedCommand": "\"<path/to/>/bin/node\" \"<path/to/>/.bin/corepack\" \"npm@<version>\" run --json smoke",
          "exitCode": 0,
          "failed": false,
          "isCanceled": false,
          "killed": false,
          "stderr": "",
          "stdout": "\n> single-script@1.0.0 smoke\n> exit 0\n",
          "timedOut": false
        },
        "script": "smoke"
      }
    ]
  },
  "stats": {
    "failedChecks": null,
    "failedScripts": 0,
    "passedChecks": null,
    "passedScripts": 1,
    "totalChecks": null,
    "totalPackageManagers": 1,
    "totalPackages": 1,
    "totalScripts": 1
  }
}

exports['@midnight-smoker/plugin-default reporter json when the script fails should provide helpful result [snapshot] 1'] = {
  "error": {
    "code": "ESMOKER_SMOKEFAILED",
    "context": {
      "results": {
        "opts": {
          "add": [],
          "all": false,
          "bail": false,
          "executor": "default",
          "include-root": false,
          "includeRoot": false,
          "json": true,
          "linger": false,
          "lint": false,
          "loose": false,
          "pkg-manager": [],
          "pkgManager": [],
          "plugin": [],
          "reporter": [
            "json"
          ],
          "rule-runner": "default",
          "ruleRunner": "default",
          "rules": {
            "no-banned-files": {
              "opts": {
                "allow": [],
                "deny": []
              },
              "severity": "error"
            },
            "no-missing-entry-point": {
              "opts": {},
              "severity": "error"
            },
            "no-missing-exports": {
              "opts": {
                "glob": true,
                "import": true,
                "order": true,
                "require": true,
                "types": true
              },
              "severity": "error"
            },
            "no-missing-pkg-files": {
              "opts": {
                "bin": true,
                "browser": true,
                "fields": [],
                "module": true,
                "types": true,
                "unpkg": true
              },
              "severity": "error"
            }
          },
          "script": [
            "smoke"
          ],
          "script-runner": "default",
          "scriptRunner": "default",
          "verbose": false,
          "workspace": []
        },
        "scripts": [
          {
            "cwd": "<cwd>",
            "error": {
              "cause": {
                "cause": {
                  "command": "<path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run --json smoke",
                  "escapedCommand": "\"<path/to/>/bin/node\" \"<path/to/>/.bin/corepack\" \"npm@<version>\" run --json smoke",
                  "exitCode": 1,
                  "failed": true,
                  "isCanceled": false,
                  "killed": false,
                  "shortMessage": "Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run --json smoke",
                  "stderr": "",
                  "stdout": "\n> fail@1.0.0 smoke\n> exit 1\n",
                  "timedOut": false
                },
                "code": "ESMOKER_EXEC",
                "context": {
                  "command": "<path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run --json smoke"
                },
                "id": "ExecError",
                "message": "Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run --json smoke\n\n> fail@1.0.0 smoke\n> exit 1\n",
                "stack": "Error: Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run --json smoke\n\n> fail@1.0.0 smoke\n> exit 1\n\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>"
              },
              "code": "ESMOKER_RUNSCRIPT",
              "context": {
                "command": "<path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run --json smoke",
                "exitCode": 1,
                "output": "\n> fail@1.0.0 smoke\n> exit 1\n",
                "pkgManager": "npm@<version>",
                "pkgName": "fail",
                "script": "smoke"
              },
              "id": "RunScriptError",
              "message": "Script smoke in package fail failed with exit code 1",
              "stack": "Error: Script smoke in package fail failed with exit code 1\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>"
            },
            "pkgName": "fail",
            "rawResult": {
              "cause": {
                "command": "<path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run --json smoke",
                "escapedCommand": "\"<path/to/>/bin/node\" \"<path/to/>/.bin/corepack\" \"npm@<version>\" run --json smoke",
                "exitCode": 1,
                "failed": true,
                "isCanceled": false,
                "killed": false,
                "shortMessage": "Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run --json smoke",
                "stderr": "",
                "stdout": "\n> fail@1.0.0 smoke\n> exit 1\n",
                "timedOut": false
              },
              "code": "ESMOKER_EXEC",
              "context": {
                "command": "<path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run --json smoke"
              },
              "id": "ExecError",
              "message": "Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run --json smoke\n\n> fail@1.0.0 smoke\n> exit 1\n",
              "stack": "Error: Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run --json smoke\n\n> fail@1.0.0 smoke\n> exit 1\n\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>"
            },
            "script": "smoke"
          }
        ]
      }
    },
    "errors": [
      {
        "cause": {
          "cause": {
            "command": "<path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run --json smoke",
            "escapedCommand": "\"<path/to/>/bin/node\" \"<path/to/>/.bin/corepack\" \"npm@<version>\" run --json smoke",
            "exitCode": 1,
            "failed": true,
            "isCanceled": false,
            "killed": false,
            "shortMessage": "Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run --json smoke",
            "stderr": "",
            "stdout": "\n> fail@1.0.0 smoke\n> exit 1\n",
            "timedOut": false
          },
          "code": "ESMOKER_EXEC",
          "context": {
            "command": "<path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run --json smoke"
          },
          "id": "ExecError",
          "message": "Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run --json smoke\n\n> fail@1.0.0 smoke\n> exit 1\n",
          "stack": "Error: Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run --json smoke\n\n> fail@1.0.0 smoke\n> exit 1\n\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>"
        },
        "code": "ESMOKER_RUNSCRIPT",
        "context": {
          "command": "<path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> run --json smoke",
          "exitCode": 1,
          "output": "\n> fail@1.0.0 smoke\n> exit 1\n",
          "pkgManager": "npm@<version>",
          "pkgName": "fail",
          "script": "smoke"
        },
        "id": "RunScriptError",
        "message": "Script smoke in package fail failed with exit code 1",
        "stack": "Error: Script smoke in package fail failed with exit code 1\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>"
      }
    ],
    "id": "SmokeFailedError",
    "message": "🤮 Maurice!",
    "stack": "AggregateError: 🤮 Maurice!\n<loc>:<line>:<col>\n<loc>:<line>:<col>\n<loc>:<line>:<col>"
  },
  "stats": {
    "failedChecks": null,
    "failedScripts": 1,
    "passedChecks": null,
    "passedScripts": 0,
    "totalChecks": null,
    "totalPackageManagers": 1,
    "totalPackages": 1,
    "totalScripts": 1
  }
}
