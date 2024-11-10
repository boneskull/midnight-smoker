import {execSmoker} from '@midnight-smoker/test-util';
import {stripAnsi} from 'midnight-smoker/util';
import unexpected from 'unexpected';

import type {SmokerJsonOutput} from '../../src/json-types';
const expect = unexpected.clone();

export function createPkgManagerTest(cwd: string, extraArgs: string[] = []) {
  return (requested: string, actual?: RegExp) => {
    describe(`requested: ${requested}`, function () {
      it('should use a matching package manager', async function () {
        const result = await execSmoker(
          [
            'run',
            'smoke',
            '--pm',
            requested,
            '--no-lint',
            '--json',
            ...extraArgs,
          ],
          // do not use json: true here since we want to fixup output ourselves
          {
            cwd,
          },
        );
        const {stdout} = result;
        const {results} = JSON.parse(stdout);
        expect(results.scripts, 'to have an item satisfying', {
          rawResult: {
            command: actual
              ? expect.it('to match', actual)
              : expect.it('to contain', requested),
          },
        });
      });
    });
  };
}

export function createBehaviorTest(cwd: string, extraArgs: string[] = []) {
  return (spec: string, actual: any) => {
    describe(`requested: ${spec}`, function () {
      it('should produce the expected', async function () {
        const {results} = await execSmoker<SmokerJsonOutput>(
          ['run', 'smoke', '--pm', spec, '--no-lint', ...extraArgs],
          {
            cwd,
            json: true,
          },
        );
        expect(results.scripts!, 'to satisfy', actual);
      });
    });
  };
}

/**
 * Strips a bunch of nondeterministic info from CLI output so that we can take a
 * snapshot of it.
 *
 * @param str - String of CLI output; usually either `stdout` or `stderr`
 * @param stripPmVersions - If true, replace `version` in
 *   `(npm|yarn|pnpm)@<version>` with the string `<version>`.
 * @returns Fixed output
 */

export function fixupOutput(str: string, stripPmVersions = true) {
  let result = stripAnsi(str)
    .replace(/(?<=GET\shttps:\/\/registry\.npmjs\.org\/).+?(?=\n)/g, 'some/url')
    .replace(/(?<=\/)\S+?\.(log|tgz|txt)/g, 'path/to/some.$1')
    .replace(/--pack-destination=\S+/g, '--pack-destination=/path/to/dir')
    // strip the versions since it will change
    .replace(/midnight-smoker v\d+\.\d+\.\d+/g, 'midnight-smoker v<version>')
    .replace(/--version\\n\\n\d+\.\d+\.\d+/g, '--version\\n\\n<version>')
    // strip the path to `cli.js` since it differs per platform
    .replace(/node(\.exe)?\s+\S+?smoker\.js/g, 'path/to/smoker.js')
    .replace(/(?<=npm\serror\s)\d{3}.+?(?=\n)/g, '<stuff>')
    .replace(/(?<="tarballFilepath":\s+")[^"]+(?=")/g, '<tarball.tgz>')
    .replace(/(?<=(['"]).+?Command failed.*?:\s).+(?=\1,?\n)/g, '<command>')
    // paths
    .replace(/(?<=")([A-Z]:\\\\|\/)[^"]+(?=")/g, '/some/path')
    // problem keys
    .replace(
      /(?<=\b(?:cwd|localPath|dest|version|escapedCommand|command|stack)["']?:\s+)(['"]).+\1(?=,?\n)/g,
      '$1<path>$1',
    )
    // stack traces
    .replace(/(?<=(?:\s{2}-\s|\sin\sdir\s))[^:]+?:\d+/g, '<file>:<line>')
    .replace(/(?<=\n\s{4})(?:[^:]+?:)\d+:\d+/g, '/some/path:<line>:<col>');

  if (stripPmVersions) {
    result = result.replace(
      /(npm|yarn|pnpm|midnight-smoker)@(?:(?:\d+\.\d+\.\d+)|latest)/g,
      '$1@<version>',
    );
  }

  return result.trim();
}
