exports['midnight-smoker [E2E] general behavior when packing fails when the package.json is missing a version field should provide a reason [snapshot] 1'] = `
ABORT
Aborted due to unrecoverable error. Bummer! [ESMOKER_SMOKE]
`

exports['midnight-smoker [E2E] general behavior when packing fails when the package.json is missing a version field when in verbose mode should provide more detail [snapshot] 1'] = `
ABORT
Aborted due to unrecoverable error. Bummer! [ESMOKER_SMOKE]

Reason:

  Invalid package.json at ./package.json [ESMOKER_INVALIDPACKAGEJSON]

Stack Trace:

  SmokeError: Aborted due to unrecoverable error. Bummer!
  - <file>:<line> result()
    /some/path:<line>:<col>

    Reason:
    InvalidPkgJsonError: Invalid package.json at ./package.json
    - <file>:<line> 
    /some/path:<line>:<col>

      Reason:
      ValidationError: Validation error: /Users/boneskull/projects/boneskull/mid      night-smoker/packages/midnight-smoker/test/e2e/fixture/general/pack-error/      package.json: Required at "version"
      - <file>:<line> new InvalidPkgJsonE        rror()
    /some/path:<line>:<col>
      - <file>:<line> 
    /some/path:<line>:<col>
`

exports['midnight-smoker [E2E] general behavior when packing fails when the package.json contains an invalid version should provide a reason [snapshot] 1'] = `
ABORT
Aborted due to unrecoverable error. Bummer! [ESMOKER_SMOKE]
`

exports['midnight-smoker [E2E] general behavior when packing fails when the package.json contains an invalid version when in verbose mode should provide more detail [snapshot] 1'] = `
ABORT
Aborted due to unrecoverable error. Bummer! [ESMOKER_SMOKE]

Reason:

  Invalid package.json at ./package.json [ESMOKER_INVALIDPACKAGEJSON]

Stack Trace:

  SmokeError: Aborted due to unrecoverable error. Bummer!
  - <file>:<line> result()
    /some/path:<line>:<col>

    Reason:
    InvalidPkgJsonError: Invalid package.json at ./package.json
    - <file>:<line> 
    /some/path:<line>:<col>

      Reason:
      ValidationError: Validation error: Not a valid SemVer version at "version"      - <file>:<line> new InvalidPkgJsonE        rror()
    /some/path:<line>:<col>
      - <file>:<line> 
    /some/path:<line>:<col>
`

exports['midnight-smoker [E2E] general behavior installation when installation fails should provide a reason [snapshot] 1'] = `
midnight-smoker@<version>

ℹ Plan: lint using four (4) rules in install-error using npm@<version> (system)

Smokin'…
npm@<version> (system) failed to install package /path/to/some.tgz: Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found
ABORT
Aborted due to unrecoverable error. Bummer! [ESMOKER_SMOKE]
`

exports['midnight-smoker [E2E] general behavior installation when installation fails when in verbose mode should provide more detail [snapshot] 1'] = `
midnight-smoker@<version>

ℹ Plan: lint using four (4) rules in install-error using npm@<version> (system)

Smokin'…
npm@<version> (system) failed to install package /path/to/some.tgz: Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found

Reason:

  Command failed with exit code 1: <command>

  Stack Trace:

    ExecError: Command failed with exit code 1: <command>
    - <file>:<line> systemExecutor()
    /some/path:<line>:<col>
    - <file>:<line> install()
    /some/path:<line>:<col>
    - <file>:<line> 
    /some/path:<line>:<col>
  

Stack Trace:

  InstallError: npm@<version> (system) failed to install "/some/path" in dir <file>:<line> maybeHandleInstallError()
    /some/path:<line>:<col>
  - <file>:<line> install()
    /some/path:<line>:<col>
  - <file>:<line> 
    /some/path:<line>:<col>

    Reason:
    ExecError: Command failed with exit code 1: <command>
    - <file>:<line> systemExecutor()
    /some/path:<line>:<col>
    - <file>:<line> install()
    /some/path:<line>:<col>
    - <file>:<line> 
    /some/path:<line>:<col>

ABORT
Aborted due to unrecoverable error. Bummer! [ESMOKER_SMOKE]

Reason:

  npm@<version> (system) failed to install package /path/to/some.tgz: Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found

Stack Trace:

  SmokeError: Aborted due to unrecoverable error. Bummer!
  - <file>:<line> result()
    /some/path:<line>:<col>

    Reason:
    InstallError: npm@<version> (system) failed to install "/some/path" in dir <file>:<line> maybeHandleInstallError()
    /some/path:<line>:<col>
    - <file>:<line> install()
    /some/path:<line>:<col>
    - <file>:<line> 
    /some/path:<line>:<col>

      Reason:
      ExecError: Command failed with exit code 1: <command>
      - <file>:<line> systemExecutor()
    /some/path:<line>:<col>
      - <file>:<line> install()
    /some/path:<line>:<col>
      - <file>:<line> 
    /some/path:<line>:<col>
`
