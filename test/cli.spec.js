const {node: execa} = require('execa');
const path = require('path');
const expect = require('unexpected')
  .clone()
  .use(require('unexpected-snapshot'));

/** @type {string} */
let CLI_PATH;
/** @type {string} */
let CWD;

if (process.env.WALLABY_PROJECT_DIR) {
  CLI_PATH = path.join(process.env.WALLABY_PROJECT_DIR, 'src', 'cli.js');
  CWD = process.env.WALLABY_PROJECT_DIR;
} else {
  CLI_PATH = require.resolve('../src/cli.js');
  CWD = path.join(__dirname, '..');
}

/**
 * @param {string[]} args
 * @param {import('execa').NodeOptions} [opts]
 */
async function run(args, opts = {}) {
  const {stdout, stderr, exitCode} = await execa(CLI_PATH, args, {
    cwd: CWD,
    ...opts,
    env: opts.env ? opts.env : {DEBUG: ''},
  });
  return {stdout, stderr, exitCode};
}

describe('midnight-smoker CLI', function () {
  describe('--version', function () {
    it('should print version and exit', async function () {
      this.timeout('5s');
      const actual = await run(['--version']);
      expect(actual, 'to equal snapshot', {
        stdout: '0.1.0',
        stderr: '',
        exitCode: 0,
      });
    });
  });

  it('should show help text', async function () {
    this.timeout('5s');

    const actual = await run(['test:smoke', '--help']);
    expect(actual, 'to equal snapshot', {
      stdout:
        "smoker <script> [scripts..]\n\nRun tests against a package as it would be published\n\nPositionals:\n  script                                                                [string]\n  scripts                                                               [string]\n\nBehavior:\n  --workspace     One or more npm workspaces to test                     [array]\n  --all           Test all workspaces                                  [boolean]\n  --include-root  Include the workspace root; must provide '--all'     [boolean]\n  --install-args  Extra arguments to pass to `npm install`               [array]\n  --dir           Working directory to use      [string] [default: new temp dir]\n  --force         Overwrite working directory if it exists             [boolean]\n  --clean         Truncate working directory; must provide '--force'   [boolean]\n  --npm           Path to `npm` executable     [string] [default: `npm` in PATH]\n  --quiet         Suppress output from `npm`                           [boolean]\n\nOptions:\n  --version  Show version number                                       [boolean]\n  --help     Show help                                                 [boolean]",
      stderr: '',
      exitCode: 0,
    });
  });

  it('should smoke test this package', async function () {
    this.timeout('5s');

    const {stdout, stderr, exitCode} = await execa(CLI_PATH, ['test:smoke'], {
      cwd: CWD,
      env: {
        DEBUG: '',
      },
    });
    const actual = {stdout, stderr, exitCode};
    expect(actual, 'to equal snapshot', {
      stdout: '',
      stderr:
        '[\n  {\n    "id": "midnight-smoker@0.1.0",\n    "name": "midnight-smoker",\n    "version": "0.1.0",\n    "size": 9876,\n    "unpackedSize": 32579,\n    "shasum": "2259e1b4572a34fed1e03716fd07043df422d929",\n    "integrity": "sha512-+Ie4WI++B4+glgw8RB0uMvOY3f2CHANRrviHvLhcGnuKW7wDcy2La4yy1tgmUZdrwPbTVsGJZT1nqn8bQ1XU6w==",\n    "filename": "midnight-smoker-0.1.0.tgz",\n    "files": [\n      {\n        "path": "LICENSE",\n        "size": 11357,\n        "mode": 420\n      },\n      {\n        "path": "README.md",\n        "size": 501,\n        "mode": 420\n      },\n      {\n        "path": "package.json",\n        "size": 2176,\n        "mode": 420\n      },\n      {\n        "path": "src/cli.js",\n        "size": 3214,\n        "mode": 493\n      },\n      {\n        "path": "src/index.js",\n        "size": 9966,\n        "mode": 420\n      },\n      {\n        "path": "static.d.ts",\n        "size": 1591,\n        "mode": 420\n      },\n      {\n        "path": "types/cli.d.ts",\n        "size": 31,\n        "mode": 420\n      },\n      {\n        "path": "types/index.d.ts",\n        "size": 1520,\n        "mode": 420\n      },\n      {\n        "path": "types/src/cli.d.ts",\n        "size": 31,\n        "mode": 420\n      },\n      {\n        "path": "types/src/index.d.ts",\n        "size": 1540,\n        "mode": 420\n      },\n      {\n        "path": "types/test/cli.spec.d.ts",\n        "size": 11,\n        "mode": 420\n      },\n      {\n        "path": "types/test/index.spec.d.ts",\n        "size": 641,\n        "mode": 420\n      }\n    ],\n    "entryCount": 12,\n    "bundled": []\n  }\n]\n\n\nadded 35 packages, and audited 36 packages in 325ms\n\n6 packages are looking for funding\n  run `npm fund` for details\n\n\nfound 0 vulnerabilities\n\n\n> midnight-smoker@0.1.0 test:smoke\n> node ./src/cli.js --version\n\n\n0.1.0\n',
      exitCode: 0,
    });
  });
});
