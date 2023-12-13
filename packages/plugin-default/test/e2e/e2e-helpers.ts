import {execSmoker, fixupOutput} from '@midnight-smoker/test-util';
import unexpected from 'unexpected';
import type {SmokerJsonSuccess} from '../../src/reporter/json';

const expect = unexpected.clone();

export function createCommandTest(cwd: string, extraArgs: string[] = []) {
  return (requested: string, actual?: RegExp) => {
    describe(`requested: ${requested}`, function () {
      it('should use a matching package manager', async function () {
        const {stdout} = await execSmoker(
          ['smoke', `--pm=${requested}`, '--no-checks', '--json', ...extraArgs],
          {
            cwd,
          },
        );
        const {results} = JSON.parse(fixupOutput(stdout, false));
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
      it('should exhibit the expected behavior', async function () {
        const {stdout} = await execSmoker(
          ['smoke', `--pm=${spec}`, '--no-checks', '--json', ...extraArgs],
          {
            cwd,
          },
        );
        const {results} = JSON.parse(
          fixupOutput(stdout, false),
        ) as SmokerJsonSuccess;
        expect(results.scripts, 'to satisfy', actual);
      });
    });
  };
}
