exports[
  'midnight-smoker smoker CLI script single script when the script succeeds should produce expected output [snapshot] 1'
] = `
💨 midnight-smoker v6.0.0
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
💨 midnight-smoker v6.0.0
- Packing current project…
✔ Packed 1 unique package using npm@<version>…
- Installing 1 unique package from tarball using npm@<version>…
✔ Installed 1 unique package from tarball
- Running script 0/1…
✖ 1 of 1 script failed
ℹ Script failure details for package fail:
» (runScript) Script "smoke" in package "fail" failed: Command failed with exit code 1: node corepack.js npm@<version> run smoke

> fail@1.0.0 smoke
> exit 1


✖ 🤮 Maurice!
`;

exports[
  'midnight-smoker smoker CLI script multiple scripts when the scripts succeed should produce expected output [snapshot] 1'
] = `
💨 midnight-smoker v6.0.0
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

For more info, see https:midnight-smoker
`;

exports[
  'midnight-smoker smoker CLI option --json when the script fails should provide helpful result [snapshot] 1'
] = {
  scripts: [
    {
      pkgName: 'fail',
      script: 'smoke',
      rawResult: {
        shortMessage:
          'Command failed with exit code 1: node corepack.js npm@<version> run smoke',
        command: 'node corepack.js npm@<version> run smoke',
        escapedCommand: '"node" "corepack.js" "npm@<version>" run smoke',
        exitCode: 1,
        stdout: '\n> fail@1.0.0 smoke\n> exit 1\n',
        stderr: '',
        failed: true,
        timedOut: false,
        isCanceled: false,
        killed: false,
      },
      cwd: 'fail',
      error: {
        message:
          '(runScript) Script "smoke" in package "fail" failed: Command failed with exit code 1: node corepack.js npm@<version> run smoke\n\n> fail@1.0.0 smoke\n> exit 1\n',
        name: 'Error',
      },
    },
  ],
  checks: {
    passed: [],
    failed: [],
  },
  opts: {
    _: [],
    json: true,
    checks: false,
    scripts: ['smoke'],
    add: [],
    pm: ['npm@latest'],
    workspace: [],
    $0: 'smoker',
    verbose: false,
  },
};

exports[
  'midnight-smoker smoker CLI option --json when the script succeeds should produce expected script output [snapshot] 1'
] = {
  scripts: [
    {
      pkgName: 'single-script',
      script: 'smoke',
      rawResult: {
        command: 'node corepack.js npm@<version> run smoke',
        escapedCommand: '"node" "corepack.js" "npm@<version>" run smoke',
        exitCode: 0,
        stdout: '\n> single-script@1.0.0 smoke\n> exit 0\n',
        stderr: '',
        failed: false,
        timedOut: false,
        isCanceled: false,
        killed: false,
      },
      cwd: 'single-script',
      error: {},
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
          pkgJsonPath: 'package.json',
          pkgPath: 'single-script',
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
          pkgJsonPath: 'package.json',
          pkgPath: 'single-script',
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
          pkgJsonPath: 'package.json',
          pkgPath: 'single-script',
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
          pkgJsonPath: 'package.json',
          pkgPath: 'single-script',
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
