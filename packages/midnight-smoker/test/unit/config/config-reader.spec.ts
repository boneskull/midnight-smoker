import {BASE_CFG_FILENAMES, ConfigReader} from '#config/config-reader';
import {PACKAGE_JSON} from '#constants';
import {FileManager} from '#util/filemanager';
import {type ImportableVolume, impvol} from 'impvol';
import {createFsFromVolume} from 'memfs';
import {describe} from 'mocha';
import path from 'node:path';
import {mapKeys} from 'remeda';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

const expect = unexpected.clone().use(unexpectedSinon);

/**
 * Contents of a CJS config file
 */
const CJS_SRC = `module.exports = {allowPrivate: true};`;

/**
 * Contents of an ESM config file
 */
const ESM_SRC = `export default {allowPrivate: true};`;

/**
 * Contents of a TS config file
 */
const TS_SRC = `export default {allowPrivate: true};`;

/**
 * Contents of a JSON config file
 */
const JSON_SRC = `{"allow-private": true}`;

/**
 * Contents of a `package.json` file with config
 */
const PACKAGE_JSON_SRC = JSON.stringify({
  name: 'test',
  smoker: {
    'allow-private': true,
  },
  version: '1.0.0',
});

/**
 * Mapping of extension to source code
 */
const extToSrc = {
  '.cjs': CJS_SRC,
  '.cts': TS_SRC,
  '.js': CJS_SRC,
  '.json': JSON_SRC,
  '.mjs': ESM_SRC,
  '.mts': TS_SRC,
  '.ts': TS_SRC,
} as const;

/**
 * List of all allowed extensions
 */
const exts = Object.keys(extToSrc);

/**
 * List of all possible config filenames (sans `package.json`)
 */
const configFilenames = BASE_CFG_FILENAMES.flatMap((name) =>
  exts.map((ext) => `${name}${ext}`),
);

/**
 * Mapping of config filename to source code
 */
const configFileMap = {
  [PACKAGE_JSON]: PACKAGE_JSON_SRC,
  ...Object.fromEntries(
    configFilenames.map((filename) => [
      filename,
      extToSrc[path.extname(filename) as keyof typeof extToSrc],
    ]),
  ),
};

/**
 * Root directory for virtual filesystem
 */
const CWD = '/test';

/**
 * Directory structure for memfs with paths prefixed by the root dir (`CWD`)
 */
const directoryJson = mapKeys(configFileMap, (key) => path.resolve(CWD, key));

describe('midnight-smoker', function () {
  describe('config', function () {
    describe('config-reader', function () {
      let vol: ImportableVolume;
      let fileManager: FileManager;
      let reader: ConfigReader;
      let sandbox: sinon.SinonSandbox;

      before(function () {
        vol = impvol();
        vol.fromJSON(directoryJson);
        fileManager = FileManager.create({
          fs: createFsFromVolume(vol) as any,
        });
        reader = ConfigReader.create(fileManager);
      });

      after(async function () {
        vol?.reset();
      });

      beforeEach(function () {
        sandbox = createSandbox();
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('method', function () {
        describe('read()', function () {
          describe('when provided the "configFile" option', function () {
            before(function () {
              vol = impvol();
              vol.fromJSON(directoryJson);
              fileManager = FileManager.create({
                fs: createFsFromVolume(vol) as any,
              });
              reader = ConfigReader.create(fileManager);
            });

            after(async function () {
              vol?.reset();
            });

            for (const name of Object.keys(directoryJson)) {
              describe(`when provided: ${name}`, function () {
                it('should fulfill with a dual-cased config object', async function () {
                  const result = await reader.read({configFile: name});

                  expect(result, 'to satisfy', {
                    'allow-private': true,
                    allowPrivate: true,
                    config: expect.it('to start with', CWD), // added automatically by config reader
                  });
                });
              });
            }
          });

          describe('when provided the "cwd" option', function () {
            afterEach(async function () {
              vol?.reset();
            });

            for (const [name, content] of Object.entries(directoryJson)) {
              describe(`when config file exists: ${name}`, function () {
                it('should fulfill with a dual-cased config object', async function () {
                  vol = impvol();
                  fileManager = FileManager.create({
                    fs: createFsFromVolume(vol) as any,
                  });
                  reader = ConfigReader.create(fileManager);
                  vol.fromJSON({[name]: content});
                  const result = await reader.read({cwd: CWD});
                  expect(result, 'to satisfy', {
                    'allow-private': true,
                    allowPrivate: true,
                    config: expect.it('to start with', CWD), // added automatically by config reader
                  });
                });
              });
            }
          });
        });
      });

      describe('static method', function () {
        describe('read()', function () {
          it('should instantiate a reader and call read()', async function () {
            const configFile = path.resolve(CWD, PACKAGE_JSON);
            const readStub = sandbox.stub(ConfigReader.prototype, 'read');
            const createSpy = sandbox.spy(ConfigReader, 'create');
            await ConfigReader.read({
              configFile,
              cwd: CWD,
              fileManager,
            });

            expect(createSpy, 'to have a call satisfying', [fileManager]).and(
              'was called once',
            );
            expect(readStub, 'to have a call satisfying', [
              {configFile, cwd: CWD},
            ]).and('was called once');
          });
        });
      });
    });
  });
});
