exports['@midnight-smoker/plugin-default reporter json when the script succeeds should produce expected script output [snapshot] 1'] = {
  "results": {
    "lint": [],
    "pkgManagers": [
      {
        "bin": "/some/path",
        "label": "npm@<version> (system)",
        "name": "npm",
        "version": "<path>"
      }
    ],
    "plugins": [
      {
        "description": "Default behavior for midnight-smoker",
        "entryPoint": "/some/path",
        "id": "@midnight-smoker/plugin-default",
        "pkgManagerNames": [
          "npm7",
          "npm9",
          "yarn-berry",
          "yarn-classic"
        ],
        "reporterNames": [
          "console",
          "json",
          "exit",
          "progress",
          "simple"
        ],
        "ruleNames": [
          "no-banned-files",
          "no-missing-entry-point",
          "no-missing-exports",
          "no-missing-pkg-files"
        ],
        "version": "<path>"
      }
    ],
    "scripts": [
      {
        "manifest": {
          "cwd": "<path>",
          "localPath": "<path>",
          "pkgJson": {
            "name": "single-script",
            "packageManager": "npm@<version>",
            "scripts": {
              "smoke": "exit 0"
            },
            "version": "<path>"
          },
          "pkgJsonPath": "/some/path",
          "pkgName": "single-script",
          "script": "smoke"
        },
        "rawResult": {
          "command": "<path>",
          "escapedCommand": "<path>",
          "exitCode": 0,
          "failed": false,
          "isCanceled": false,
          "killed": false,
          "stderr": "\n> single-script@1.0.0 smoke\n> exit 0\n",
          "stdout": "",
          "timedOut": false
        },
        "type": "OK"
      }
    ],
    "smokerOptions": {
      "add": [],
      "all": false,
      "allow-private": false,
      "allowPrivate": false,
      "bail": false,
      "cwd": "<path>",
      "executor": "default",
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
      "verbose": false,
      "workspace": []
    },
    "success": true,
    "type": "OK",
    "workspaceInfo": [
      {
        "localPath": "<path>",
        "pkgJsonPath": "/some/path",
        "pkgName": "single-script",
        "private": false
      }
    ]
  },
  "stats": {
    "failedRules": null,
    "failedScripts": 0,
    "passedRules": null,
    "passedScripts": 1,
    "totalPackageManagers": 1,
    "totalPackages": 1,
    "totalRules": null,
    "totalScripts": 1
  }
}

exports['@midnight-smoker/plugin-default reporter json when the script fails should provide helpful result [snapshot] 1'] = {
  "results": {
    "error": {
      "cause": {
        "cause": {
          "cause": null,
          "code": "ESMOKER_EXEC",
          "context": "Error: Command failed with exit code 1: <command>",
          "message": "Command failed with exit code 1: <command>",
          "name": "ExecError",
          "stack": "<path>"
        },
        "code": "ESMOKER_RUNSCRIPT",
        "context": {
          "command": "<path>",
          "exitCode": 1,
          "output": "\n> fail@1.0.0 smoke\n> exit 1\n",
          "pkgManager": "npm@<version> (system)",
          "pkgName": "fail",
          "script": "smoke"
        },
        "message": "Script smoke in package fail failed with exit code 1",
        "name": "RunScriptError",
        "stack": "<path>"
      },
      "code": "ESMOKER_SMOKE",
      "context": null,
      "errors": [
        {
          "cause": {
            "cause": null,
            "code": "ESMOKER_EXEC",
            "context": "Error: Command failed with exit code 1: <command>",
            "message": "Command failed with exit code 1: <command>",
            "name": "ExecError",
            "stack": "<path>"
          },
          "code": "ESMOKER_RUNSCRIPT",
          "context": {
            "command": "<path>",
            "exitCode": 1,
            "output": "\n> fail@1.0.0 smoke\n> exit 1\n",
            "pkgManager": "npm@<version> (system)",
            "pkgName": "fail",
            "script": "smoke"
          },
          "message": "Script smoke in package fail failed with exit code 1",
          "name": "RunScriptError",
          "stack": "<path>"
        }
      ],
      "message": "Aborted due to unrecoverable error. Bummer!",
      "name": "SmokeError",
      "stack": "<path>"
    },
    "lint": [],
    "pkgManagers": [
      {
        "bin": "/some/path",
        "label": "npm@<version> (system)",
        "name": "npm",
        "version": "<path>"
      }
    ],
    "plugins": [
      {
        "description": "Default behavior for midnight-smoker",
        "entryPoint": "/some/path",
        "id": "@midnight-smoker/plugin-default",
        "pkgManagerNames": [
          "npm7",
          "npm9",
          "yarn-berry",
          "yarn-classic"
        ],
        "reporterNames": [
          "console",
          "json",
          "exit",
          "progress",
          "simple"
        ],
        "ruleNames": [
          "no-banned-files",
          "no-missing-entry-point",
          "no-missing-exports",
          "no-missing-pkg-files"
        ],
        "version": "<path>"
      }
    ],
    "scripts": [
      {
        "error": {
          "cause": {
            "cause": null,
            "code": "ESMOKER_EXEC",
            "context": "Error: Command failed with exit code 1: <command>",
            "message": "Command failed with exit code 1: <command>",
            "name": "ExecError",
            "stack": "<path>"
          },
          "code": "ESMOKER_RUNSCRIPT",
          "context": {
            "command": "<path>",
            "exitCode": 1,
            "output": "\n> fail@1.0.0 smoke\n> exit 1\n",
            "pkgManager": "npm@<version> (system)",
            "pkgName": "fail",
            "script": "smoke"
          },
          "message": "Script smoke in package fail failed with exit code 1",
          "name": "RunScriptError",
          "stack": "<path>"
        },
        "manifest": {
          "cwd": "<path>",
          "localPath": "<path>",
          "pkgJson": {
            "name": "fail",
            "scripts": {
              "smoke": "exit 1"
            },
            "version": "<path>"
          },
          "pkgJsonPath": "/some/path",
          "pkgName": "fail",
          "script": "smoke"
        },
        "type": "ERROR"
      }
    ],
    "smokerOptions": {
      "add": [],
      "all": false,
      "allow-private": false,
      "allowPrivate": false,
      "bail": false,
      "cwd": "<path>",
      "executor": "default",
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
      "verbose": false,
      "workspace": []
    },
    "success": true,
    "type": "ERROR",
    "workspaceInfo": [
      {
        "localPath": "<path>",
        "pkgJsonPath": "/some/path",
        "pkgName": "fail",
        "private": false
      }
    ]
  },
  "stats": {
    "failedRules": null,
    "failedScripts": 0,
    "passedRules": null,
    "passedScripts": 0,
    "totalPackageManagers": 1,
    "totalPackages": 1,
    "totalRules": null,
    "totalScripts": 1
  }
}
