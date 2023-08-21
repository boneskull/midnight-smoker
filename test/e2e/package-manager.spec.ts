import unexpected from 'unexpected';
import path from 'node:path';
import {execSmoker, fixupOutput} from './helpers';
import {readPackageJson} from '../../src/util';

const expect = unexpected.clone();

function createCommandTest(cwd: string, extraArgs: string[] = []) {
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

function createBehaviorTest(cwd: string, extraArgs: string[] = []) {
  return (requested: string, actual: any) => {
    describe(`requested: ${requested}`, function () {
      it('should exhibit the expected behavior', async function () {
        const {stdout} = await execSmoker(
          ['smoke', `--pm=${requested}`, '--no-checks', '--json', ...extraArgs],
          {
            cwd,
          },
        );
        const {results} = JSON.parse(fixupOutput(stdout, false));
        expect(results.scripts, 'to satisfy', actual);
      });
    });
  };
}

describe('midnight-smoker', function () {
  describe('smoker CLI', function () {
    describe('option', function () {
      describe('--pm', function () {
        // can take awhile if the versions are not cached
        this.timeout('10s');

        describe('when the package.json contains a "packageManager" field', function () {
          const cwd = path.join(__dirname, 'fixture', 'corepack');

          it('should be ignored and run anyway', async function () {
            const {packageJson} = await readPackageJson({cwd, strict: true});
            const {packageManager} = packageJson;
            const {stdout} = await execSmoker(
              ['smoke', '--pm=npm@latest', '--json', '--no-checks'],
              {
                cwd,
              },
            );
            const {results} = JSON.parse(fixupOutput(stdout, false));
            expect(results, 'to satisfy', {
              scripts: expect
                .it('to have length', 1)
                .and('not to have an item satisfying', {
                  rawResult: expect.it('to contain', packageManager),
                }),
            });
          });
        });

        describe('npm', function () {
          const testHappyPath = createCommandTest(
            path.join(__dirname, 'fixture', 'single-script'),
          );

          const happyMatrix = [
            ['npm@7', /npm@7\.\d+\.\d+/],
            ['npm@7.24.0'],
            ['npm@latest-7', /npm@7\.\d+\.\d+/],
            ['npm@^7.0.0', /npm@7\.\d+\.\d+/],
            ['npm@8', /npm@8\.\d+\.\d+/],
            ['npm@8.10.0'],
            ['npm@^8.0.0', /npm@8\.\d+\.\d+/],
            ['npm@9', /npm@9\.\d+\.\d+/],
            ['npm@9.8.1'],
            ['npm@^9.0.0', /npm@9\.\d+\.\d+/],
            ['npm@next-10', /npm@10\.\d+\.\d+/],
          ] as const;

          for (const [requested, actual] of happyMatrix) {
            testHappyPath(requested, actual);
          }

          describe('behavior', function () {
            const looseMatrix = ['npm@7', 'npm@9'] as const;

            const testLoose = createBehaviorTest(
              path.join(__dirname, 'fixture', 'loose'),
              ['--all', '--loose'],
            );

            describe('--loose', function () {
              for (const requested of looseMatrix) {
                testLoose(
                  requested,
                  expect.it('to have an item satisfying', {skipped: true}),
                );
              }
            });
          });
        });

        describe('yarn', function () {
          const testHappyPath = createCommandTest(
            path.join(__dirname, 'fixture', 'single-script'),
          );

          const happyMatrix = [
            ['yarn@1', /yarn@1\.\d+\.\d+/],
            ['yarn@1.22.19'],
            ['yarn@latest', /yarn@1\.\d+\.\d+/],
            ['yarn@legacy', /yarn@1\.21\.1/],
            ['yarn@^1.0.0', /yarn@1\.\d+\.\d+/],
            ['yarn@2', /yarn@2\.\d+\.\d+/],
            ['yarn@berry', /yarn@2\.\d+\.\d+/],
            ['yarn@3', /yarn@3\.\d+\.\d+/],
          ] as const;

          for (const [requested, actual] of happyMatrix) {
            testHappyPath(requested, actual);
          }

          describe('behavior', function () {
            const looseMatrix = ['yarn@1', 'yarn@2', 'yarn@3'] as const;

            const testLoose = createBehaviorTest(
              path.join(__dirname, 'fixture', 'loose'),
              ['--all', '--loose'],
            );

            describe('--loose', function () {
              for (const requested of looseMatrix) {
                testLoose(
                  requested,
                  expect.it('to have an item satisfying', {skipped: true}),
                );
              }
            });
          });
        });

        describe('pnpm', function () {
          it('should fail (for now)', async function () {
            const cwd = path.join(__dirname, 'fixture', 'single-script');
            await expect(
              execSmoker(['smoke', `--pm=pnpm`, '--json', '--no-checks'], {
                cwd,
              }),
              'to be rejected with error satisfying',
              /pnpm is currently unsupported/,
            );
          });
        });
      });
    });
  });
});
