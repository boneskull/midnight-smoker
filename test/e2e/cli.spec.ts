import {node as execa, type NodeOptions} from 'execa';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import unexpected from 'unexpected';
import snapshot from 'snap-shot-it';

const {version} = JSON.parse(
  readFileSync(require.resolve('../../package.json'), 'utf8'),
);

const expect = unexpected.clone();

let CLI_PATH: string;
let CWD: string;

if (process.env.WALLABY_PROJECT_DIR) {
  CLI_PATH = path.join(process.env.WALLABY_PROJECT_DIR, 'bin', 'smoker.js');
  CWD = process.env.WALLABY_PROJECT_DIR;
} else {
  CLI_PATH = require.resolve('../../bin/smoker.js');
  CWD = path.join(__dirname, '..', '..');
}

async function run(args: string[], opts: NodeOptions = {}) {
  const {stdout, stderr, exitCode} = await execa(CLI_PATH, args, {
    cwd: CWD,
    ...opts,
    env: opts.env ? opts.env : {DEBUG: ''},
  });
  return {stdout, stderr, exitCode};
}

describe('midnight-smoker CLI', function () {
  this.timeout('20s');
  this.slow('10s');

  describe('--version', function () {
    it('should print version and exit', async function () {
      const actual = await run(['--version']);
      expect(actual, 'to equal', {
        stdout: version,
        stderr: '',
        exitCode: 0,
      });
    });
  });

  it('should show help text', async function () {
    snapshot(await run(['test:smoke', '--help']));
  });

  it('should smoke test this and produce JSON output', async function () {
    const {stdout, stderr, exitCode} = await execa(
      CLI_PATH,
      ['smoke', '--json'],
      {
        cwd: CWD,
        env: {
          DEBUG: '',
        },
      },
    );
    const result = {stdout, stderr, exitCode};
    result.stdout = result.stdout
      // strip the path to npm from the `command` & `escapedCommand` since it could differ depending where this is run
      .replace(
        /(?<="(escaped)?[cC]ommand":\s*?")(.+?)(?=\/bin\/npm)/g,
        '<path/to>',
      )
      // strip the versions since it could change
      .replace(/midnight-smoker@\d+\.\d+\.\d+/, 'midnight-smoker@<version>')
      .replace(/--version\\n\\n\d+\.\d+\.\d+/, '--version\\n\\n<version>')
      // strip the path to `cli.js` since it differs per platform
      .replace(/node(\.cmd)?\s+.+?smoker\.js/, '<path/to/>smoker.js');

    snapshot(result);
  });
});
