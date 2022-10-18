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
        stdout: '1.1.1',
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
        "smoker <script> [scripts..]\n\nRun tests against a package as it would be published\n\nPositionals:\n  script                                                                [string]\n  scripts                                                               [string]\n\nBehavior:\n  --workspace     One or more npm workspaces to test                     [array]\n  --all           Test all workspaces                                  [boolean]\n  --include-root  Include the workspace root; must provide '--all'     [boolean]\n  --install-args  Extra arguments to pass to `npm install`               [array]\n  --dir           Working directory to use      [string] [default: new temp dir]\n  --force         Overwrite working directory if it exists             [boolean]\n  --clean         Truncate working directory; must provide '--force'   [boolean]\n  --npm           Path to `npm` executable     [string] [default: `npm` in PATH]\n  --verbose       Print output from npm                                [boolean]\n  --bail          When running scripts, halt on first error            [boolean]\n  --json          Output JSON only                                     [boolean]\n\nOptions:\n  --version  Show version number                                       [boolean]\n  --help     Show help                                                 [boolean]",
      stderr: '',
      exitCode: 0,
    });
  });

  it('should smoke test this and produce JSON output', async function () {
    this.timeout('5s');

    const {stdout, stderr, exitCode} = await execa(
      CLI_PATH,
      ['test:smoke', '--json'],
      {
        cwd: CWD,
        env: {
          DEBUG: '',
        },
      }
    );
    const actual = {stdout, stderr, exitCode};
    actual.stdout = actual.stdout
      // strip the path to npm from the `command` & `escapedCommand` since it could differ depending where this is run
      .replace(
        /(?<="(escaped)?[cC]ommand":\s*?")(.+?)(?=\/bin\/npm)/g,
        '<path/to>'
      )
      // strip the versions since it could change
      .replace(/midnight-smoker@\d+\.\d+\.\d+/, 'midnight-smoker@<version>')
      .replace(/--version\\n\\n\d+\.\d+\.\d+/, '--version\\n\\n<version>')
      // strip the path to `cli.js` since it differs per platform
      .replace(/node(\.cmd)?\s+.+?cli\.js/, '<path/to/>cli.js');

    expect(actual, 'to equal snapshot', {
      stdout:
        '{\n  "scripts": [\n    "test:smoke"\n  ],\n  "total": 1,\n  "executed": 1,\n  "failures": 0,\n  "results": [\n    {\n      "pkgName": "midnight-smoker",\n      "script": "test:smoke",\n      "command": "<path/to>/bin/npm run-script test:smoke",\n      "escapedCommand": "<path/to>/bin/npm\\" run-script \\"test:smoke\\"",\n      "exitCode": 0,\n      "stdout": "\\n> midnight-smoker@<version> test:smoke\\n> <path/to/>cli.js --version\\n\\n<version>",\n      "stderr": "",\n      "failed": false,\n      "timedOut": false,\n      "isCanceled": false,\n      "killed": false\n    }\n  ]\n}',
      stderr: '',
      exitCode: 0,
    });
    expect(() => JSON.parse(actual.stdout), 'not to throw');
  });
});
