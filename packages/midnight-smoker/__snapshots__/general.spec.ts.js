exports['midnight-smoker [E2E] general behavior when packing fails should provide a reason [snapshot] 1'] = `
💨 midnight-smoker@<version>

- Packing current project…
✖ Package manager npm@<version> failed to pack: Invalid package, must have name and version (ESMOKER_PACK)
✖ 🤮 Maurice!
`

exports['midnight-smoker [E2E] general behavior when packing fails when in verbose mode should provide more detail [snapshot] 1'] = `
💨 midnight-smoker@<version>

- Packing current project…
✖ Package manager npm@<version> failed to pack: Invalid package, must have name and version (ESMOKER_PACK)

Script Context:
undefined

Stack Trace:
PackError: Package manager npm@<version> failed to pack: Invalid package, must have name and version<loc>:<line>:<col><loc>:<line>:<col><loc>:<line>:<col>
    at async Promise.all (index 0)<loc>:<line>:<col><loc>:<line>:<col><loc>:<line>:<col><loc>:<line>:<col><loc>:<line>:<col> {
  context: {
    error: {
      summary: 'Invalid package, must have name and version'
    },
    spec: 'npm@<version>',
    cwd: undefined,
    dest: '<dest>',
    exitCode: 1,
    output: 'npm ERR! Invalid package, must have name and version\\n' +
      '\\n' +
      'npm ERR! A complete log of this run can be found in: /<path/to/some>.log'
  },
  cause: undefined,
  code: 'ESMOKER_PACK',
  id: 'PackError'
}
✖ 🤮 Maurice!
`

exports['midnight-smoker [E2E] general behavior installation when installation fails should provide a reason [snapshot] 1'] = `
💨 midnight-smoker@<version>

- Packing current project…
✔ Packed one (1) package using npm@<version>…
- Installing one (1) package from tarball using npm@<version>…
✖ Package manager npm@<version> failed to install /<path/to/some>.tgz in dir <cwd>: Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found (ESMOKER_INSTALL)
✖ 🤮 Maurice!
`

exports['midnight-smoker [E2E] general behavior installation when installation fails when in verbose mode should provide more detail [snapshot] 1'] = `
💨 midnight-smoker@<version>

- Packing current project…
✔ Packed one (1) package using npm@<version>…
- Installing one (1) package from tarball using npm@<version>…
✖ Package manager npm@<version> failed to install /<path/to/some>.tgz in dir <cwd>: Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found (ESMOKER_INSTALL)

Script Context:
{
  context: {
    command: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> install --no-audit --no-package-lock --install-strategy=shallow --json /<path/to/some>.tgz'
  },
  cause: {
    shortMessage: 'Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> install --no-audit --no-package-lock --install-strategy=shallow --json /<path/to/some>.tgz',
    command: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> install --no-audit --no-package-lock --install-strategy=shallow --json /<path/to/some>.tgz',
    escapedCommand: '"<path/to/>/bin/node" "<path/to/>/.bin/corepack" "npm@<version>" install --no-audit --no-package-lock "--install-strategy=shallow" --json "/<path/to/some>.tgz"',
    exitCode: 1,
    signal: undefined,
    signalDescription: undefined,
    stdout: '{\\n  "error": {\\n    "code": "E404",\\n    "summary": "Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found",\\n    "detail": "\\n \\'4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd@1.0.0\\' is not in this registry.\\n\\nNote that you can also install from a\\ntarball, folder, http url, or git url."\\n  }\\n}',
    stderr: 'npm ERR! code E404\\nnpm ERR! 404 Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found\\nnpm ERR! 404 \\nnpm ERR! 404  \\'4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd@1.0.0\\' is not in this registry.\\nnpm ERR! 404 \\nnpm ERR! 404 Note that you can also install from a\\nnpm ERR! 404 tarball, folder, http url, or git url.\\n\\nnpm ERR! A complete log of this run can be found in: /<path/to/some>.log',
    failed: true,
    timedOut: false,
    isCanceled: false,
    killed: false
  },
  code: 'ESMOKER_EXEC',
  id: 'ExecError',
  command: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> install --no-audit --no-package-lock --install-strategy=shallow --json /<path/to/some>.tgz',
  exitCode: 1,
  all: undefined,
  stderr: 'npm ERR! code E404\\nnpm ERR! 404 Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found\\nnpm ERR! 404 \\nnpm ERR! 404  \\'4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd@1.0.0\\' is not in this registry.\\nnpm ERR! 404 \\nnpm ERR! 404 Note that you can also install from a\\nnpm ERR! 404 tarball, folder, http url, or git url.\\n\\nnpm ERR! A complete log of this run can be found in: /<path/to/some>.log',
  stdout: '{\\n  "error": {\\n    "code": "E404",\\n    "summary": "Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found",\\n    "detail": "\\n \\'4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd@1.0.0\\' is not in this registry.\\n\\nNote that you can also install from a\\ntarball, folder, http url, or git url."\\n  }\\n}',
  failed: true
}

Stack Trace:
InstallError: Package manager npm@<version> failed to install /<path/to/some>.tgz in dir <cwd>: Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found<loc>:<line>:<col><loc>:<line>:<col><loc>:<line>:<col><loc>:<line>:<col>
    ... 4 lines matching cause stack trace ...<loc>:<line>:<col> {
  context: {
    pkgManager: 'npm@<version>',
    installSpecs: [
      '/<path/to/some>.tgz'
    ],
    cwd: '<cwd>',
    exitCode: 1,
    output: 'npm ERR! code E404\\n' +
      'npm ERR! 404 Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found\\n' +
      'npm ERR! 404 \\n' +
      "npm ERR! 404  '4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd@1.0.0' is not in this registry.\\n" +
      'npm ERR! 404 \\n' +
      'npm ERR! 404 Note that you can also install from a\\n' +
      'npm ERR! 404 tarball, folder, http url, or git url.\\n' +
      '\\n' +
      'npm ERR! A complete log of this run can be found in: /<path/to/some>.log',
    error: {
      code: 'E404',
      summary: 'Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found',
      detail: '\\n' +
        " '4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd@1.0.0' is not in this registry.\\n" +
        '\\n' +
        'Note that you can also install from a\\n' +
        'tarball, folder, http url, or git url.'
    }
  },
  cause: ExecError: Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> install --no-audit --no-package-lock --install-strategy=shallow --json /<path/to/some>.tgz
  npm ERR! code E404
  npm ERR! 404 Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found
  npm ERR! 404 
  npm ERR! 404  '4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd@1.0.0' is not in this registry.
  npm ERR! 404 
  npm ERR! 404 Note that you can also install from a
  npm ERR! 404 tarball, folder, http url, or git url.
  
  npm ERR! A complete log of this run can be found in: /<path/to/some>.log
  {
    "error": {
      "code": "E404",
      "summary": "Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found",
      "detail": "\\n '4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd@1.0.0' is not in this registry.\\n\\nNote that you can also install from a\\ntarball, folder, http url, or git url."
    }
  }<loc>:<line>:<col><loc>:<line>:<col><loc>:<line>:<col>
      ... 4 lines matching cause stack trace ...<loc>:<line>:<col><loc>:<line>:<col> {
    context: {
      command: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> install --no-audit --no-package-lock --install-strategy=shallow --json /<path/to/some>.tgz'
    },
    cause: Error: Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> install --no-audit --no-package-lock --install-strategy=shallow --json /<path/to/some>.tgz
    npm ERR! code E404
    npm ERR! 404 Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found
    npm ERR! 404 
    npm ERR! 404  '4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd@1.0.0' is not in this registry.
    npm ERR! 404 
    npm ERR! 404 Note that you can also install from a
    npm ERR! 404 tarball, folder, http url, or git url.
    
    npm ERR! A complete log of this run can be found in: /<path/to/some>.log
    {
      "error": {
        "code": "E404",
        "summary": "Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found",
        "detail": "\\n '4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd@1.0.0' is not in this registry.\\n\\nNote that you can also install from a\\ntarball, folder, http url, or git url."
      }
    }<loc>:<line>:<col><loc>:<line>:<col><loc>:<line>:<col><loc>:<line>:<col><loc>:<line>:<col><loc>:<line>:<col>
        at async Promise.all (index 0)<loc>:<line>:<col><loc>:<line>:<col><loc>:<line>:<col> {
      shortMessage: 'Command failed with exit code 1: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> install --no-audit --no-package-lock --install-strategy=shallow --json /<path/to/some>.tgz',
      command: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> install --no-audit --no-package-lock --install-strategy=shallow --json /<path/to/some>.tgz',
      escapedCommand: '"<path/to/>/bin/node" "<path/to/>/.bin/corepack" "npm@<version>" install --no-audit --no-package-lock "--install-strategy=shallow" --json "/<path/to/some>.tgz"',
      exitCode: 1,
      signal: undefined,
      signalDescription: undefined,
      stdout: '{\\n' +
        '  "error": {\\n' +
        '    "code": "E404",\\n' +
        '    "summary": "Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found",\\n' +
        \`    "detail": "\\\\n '4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd@1.0.0' is not in this registry.\\\\n\\\\nNote that you can also install from a\\\\ntarball, folder, http url, or git url."\\n\` +
        '  }\\n' +
        '}',
      stderr: 'npm ERR! code E404\\n' +
        'npm ERR! 404 Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found\\n' +
        'npm ERR! 404 \\n' +
        "npm ERR! 404  '4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd@1.0.0' is not in this registry.\\n" +
        'npm ERR! 404 \\n' +
        'npm ERR! 404 Note that you can also install from a\\n' +
        'npm ERR! 404 tarball, folder, http url, or git url.\\n' +
        '\\n' +
        'npm ERR! A complete log of this run can be found in: /<path/to/some>.log',
      failed: true,
      timedOut: false,
      isCanceled: false,
      killed: false
    },
    code: 'ESMOKER_EXEC',
    id: 'ExecError',
    command: <path/to/>/bin/node <path/to/>/.bin/corepack npm@<version> install --no-audit --no-package-lock --install-strategy=shallow --json /<path/to/some>.tgz',
    exitCode: 1,
    all: undefined,
    stderr: 'npm ERR! code E404\\n' +
      'npm ERR! 404 Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found\\n' +
      'npm ERR! 404 \\n' +
      "npm ERR! 404  '4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd@1.0.0' is not in this registry.\\n" +
      'npm ERR! 404 \\n' +
      'npm ERR! 404 Note that you can also install from a\\n' +
      'npm ERR! 404 tarball, folder, http url, or git url.\\n' +
      '\\n' +
      'npm ERR! A complete log of this run can be found in: /<path/to/some>.log',
    stdout: '{\\n' +
      '  "error": {\\n' +
      '    "code": "E404",\\n' +
      '    "summary": "Not Found - GET https://registry.npmjs.org/4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd - Not found",\\n' +
      \`    "detail": "\\\\n '4923867iajhiknfdeskjusyghikuwyhwaqheakkcjzhxfksdjfhd@1.0.0' is not in this registry.\\\\n\\\\nNote that you can also install from a\\\\ntarball, folder, http url, or git url."\\n\` +
      '  }\\n' +
      '}',
    failed: true
  },
  code: 'ESMOKER_INSTALL',
  id: 'InstallError'
}
✖ 🤮 Maurice!
`
