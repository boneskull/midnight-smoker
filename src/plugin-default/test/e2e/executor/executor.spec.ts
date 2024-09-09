import {execSmoker} from '@midnight-smoker/test-util';
import {FileManager} from 'midnight-smoker/util';
import path from 'node:path';
import unexpected from 'unexpected';

import {fixupOutput} from '../e2e-helpers.js';

const expect = unexpected.clone();

describe('@midnight-smoker/plugin-default', function () {
  describe('component', function () {
    describe('executor', function () {
      // can take awhile if the versions are not cached
      this.timeout('10s');

      describe('when the package.json contains a "packageManager" field', function () {
        const cwd = path.join(__dirname, 'fixture', 'package-manager-field');

        let pkgManager: string;

        before(async function () {
          const {packageJson} = await FileManager.create().findPkgUp(cwd, {
            strict: true,
          });
          pkgManager = `${packageJson.packageManager}`;
        });

        describe('when the requested package manager differs', function () {
          it('should run the requested package manager', async function () {
            const result = await execSmoker(
              ['run', 'smoke', '--json', '--no-lint'],
              {
                cwd,
              },
            );

            const {results} = JSON.parse(fixupOutput(result.stdout, false));
            expect(results, 'to satisfy', {
              scripts: expect
                .it('to have length', 1)
                .and('not to have an item satisfying', {
                  rawResult: expect.it('to contain', pkgManager),
                }),
            });
          });
        });
      });
    });
  });
});
