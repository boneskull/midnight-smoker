import unexpected from 'unexpected';
import path from 'node:path';
import {execSmoker, fixupOutput} from './helpers';
import {readPackageJson} from '../../src/util';

const expect = unexpected.clone();

function testInCwd(cwd: string) {
  return (requested: string, actual?: RegExp) => {
    describe(`requested: ${requested}`, function () {
      it('should use a matching package manager', async function () {
        const {stdout} = await execSmoker(
          ['smoke', `--pm=${requested}`, '--json', '--linger'],
          {
            cwd,
          },
        );
        const {results} = JSON.parse(fixupOutput(stdout, false));
        expect(results, 'to have an item satisfying', {
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
              ['smoke', '--pm=npm@latest', '--json'],
              {
                cwd,
              },
            );
            const {results} = JSON.parse(fixupOutput(stdout, false));
            expect(results, 'to have an item satisfying', {
              rawResult: {
                command: expect.it('not to contain', packageManager),
              },
            });
          });
        });

        describe('npm', function () {
          const test = testInCwd(
            path.join(__dirname, 'fixture', 'single-script'),
          );

          test('npm@7', /npm@7\.\d+\.\d+/);
          test('npm@7.24.0');
          test('npm@latest-7', /npm@7\.\d+\.\d+/);
          test('npm@^7.0.0', /npm@7\.\d+\.\d+/);
          test('npm@8', /npm@8\.\d+\.\d+/);
          test('npm@8.10.0');
          test('npm@^8.0.0', /npm@8\.\d+\.\d+/);
          test('npm@9', /npm@9\.\d+\.\d+/);
          test('npm@9.8.1');
          test('npm@^9.0.0', /npm@9\.\d+\.\d+/);
          test('npm@next-10', /npm@10\.\d+\.\d+/);
        });

        describe('yarn', function () {
          const test = testInCwd(
            path.join(__dirname, 'fixture', 'single-script'),
          );

          test('yarn@1', /yarn@1\.\d+\.\d+/);
          test('yarn@1.22.19');
          test('yarn@latest', /yarn@1\.\d+\.\d+/);
          test('yarn@legacy', /yarn@1\.21\.1/);
          test('yarn@^1.0.0', /yarn@1\.\d+\.\d+/);
          test('yarn@2', /yarn@2\.\d+\.\d+/);
          test('yarn@berry', /yarn@2\.\d+\.\d+/);
          test('yarn@3', /yarn@3\.\d+\.\d+/);
        });
      });
    });
  });
});
