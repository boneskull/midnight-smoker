import {Midconfig, type MidconfigResult} from '#config';
import {FileManager} from '#util/filemanager';
import {type ImportableVolume, impvol} from 'impvol';
import {createFsFromVolume} from 'memfs';
import {describe} from 'mocha';
import path from 'node:path';
import unexpected from 'unexpected';

const expect = unexpected.clone();

const configFiles = {
  'package.json': JSON.stringify({
    name: 'test',
    test: {
      key: 'value',
    },
    version: '1.0.0',
  }),
  'test.config.cjs': `module.exports = {key: 'value'};`,
  'test.config.cts': `export default {key: 'value'} as const;`,
  'test.config.json': JSON.stringify({
    key: 'value',
  }),
  'test.config.mjs': `export default {key: 'value'};`,
  'test.config.mts': `export default {key: 'value'} as const;`,
} as const;

describe('midnight-smoker', function () {
  describe('config', function () {
    describe('Midconfig', function () {
      describe('method', function () {
        const CWD = '/test';

        let vol: ImportableVolume;
        let fileManager: FileManager;

        beforeEach(function () {
          vol = impvol();
          fileManager = FileManager.create({
            fs: createFsFromVolume(vol) as any,
          });
        });

        afterEach(async function () {
          vol?.reset();
        });

        describe('search()', function () {
          for (const [name, content] of Object.entries(configFiles)) {
            describe(`when config file accessible: ${name}`, function () {
              it('should find & load the config file', async function () {
                const filepath = CWD;

                const midconfig = new Midconfig('test', fileManager);
                vol.fromJSON({[name]: content}, CWD);

                await expect(
                  midconfig.search(filepath),
                  'to be fulfilled with value satisfying',
                  {
                    config: {key: 'value'},
                    filepath: path.join(CWD, name),
                  },
                );
              });
            });
          }
        });

        describe('load()', function () {
          for (const [name, content] of Object.entries(configFiles)) {
            describe(`when provided config file: ${name}`, function () {
              it('should load the config file', async function () {
                const filepath = path.join(CWD, name);

                const midconfig = new Midconfig('test', fileManager);
                vol.fromJSON({[name]: content}, CWD);

                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                const result = (await midconfig.load(
                  filepath,
                )) as NonNullable<MidconfigResult>;

                expect({...result.config}, 'to satisfy', {key: 'value'});
              });
            });
          }
        });
      });
    });
  });
});
