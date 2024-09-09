import {mimport} from '#util/importer';
import {type ImportableVolume, impvol} from 'impvol';
import {pathToFileURL} from 'node:url';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('importer', function () {
      describe('mimport()', function () {
        const CWD = '/test';

        let vol: ImportableVolume;

        beforeEach(function () {
          vol = impvol(
            {
              'test-module.mjs': 'export default "defaultExport";',
              'test-module-default.cjs':
                'module.exports = {namedExport: "namedExport"};',
              'test-module-named.cjs': 'exports.namedExport = "namedExport";',
            },
            CWD,
          );
        });

        afterEach(async function () {
          vol?.reset();
        });

        it('should import a module by string moduleId', async function () {
          const result = await mimport(`${CWD}/test-module.mjs`);
          expect(result, 'to be defined');
        });

        it('should import a module by URL moduleId', async function () {
          const moduleId = pathToFileURL(`${CWD}/test-module.mjs`);
          const result = await mimport(moduleId);
          expect(result, 'to be defined');
        });

        describe('when moduleId is not absolute', function () {
          it('should throw', async function () {
            const moduleId = 'relative/path/to/module.js';
            await expect(
              () => mimport(moduleId),
              'to be rejected with error satisfying',
              expect.it('to be a', TypeError),
            );
          });
        });

        it('should unwrap default export if it exists', async function () {
          const result = await mimport(`${CWD}/test-module-default.cjs`);
          expect(result, 'to equal', {namedExport: 'namedExport'});
        });

        it('should return the module itself if no default export exists', async function () {
          const result = await mimport(`${CWD}/test-module-named.cjs`);
          expect(result, 'to satisfy', {namedExport: 'namedExport'});
        });
      });
    });
  });
});
