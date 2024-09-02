import {TRANSIENT} from '#constants';
import {ErrorCode} from '#error/codes';
import {PluginMetadata} from '#plugin/plugin-metadata';
import path from 'node:path';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';

const expect = unexpected.clone();

const TEST_ENTRYPOINT = path.join(process.cwd(), 'entryPoint.js');
const TEST_ID = path.basename(TEST_ENTRYPOINT);
const TEST_OPTS = {
  entryPoint: TEST_ENTRYPOINT,
  pkgJson: {description: 'poor snuckles', name: 'snuckles', version: '1.0.0'},
  requestedAs: TEST_ENTRYPOINT,
};

describe('midnight-smoker', function () {
  describe('plugin', function () {
    describe('PluginMetadata', function () {
      let sandbox: sinon.SinonSandbox;

      beforeEach(function () {
        sandbox = createSandbox();
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('instance method', function () {
        let metadata: Readonly<PluginMetadata>;

        beforeEach(function () {
          metadata = PluginMetadata.create(TEST_OPTS);
        });

        describe('toJSON()', function () {
          it('should return a StaticPluginMetadata object', function () {
            expect(metadata.toJSON(), 'to satisfy', {
              description: 'poor snuckles',
              id: 'snuckles',
              version: '1.0.0',
            });
          });
        });

        describe('toString()', function () {
          describe('when the "pkgJson" prop has a "version" prop', function () {
            it('should return a description of the plugin containing the version', function () {
              expect(
                metadata.toString(),
                'to match',
                /\[Plugin snuckles@1\.0\.0\]/,
              );
            });
          });
        });
      });

      describe('static method', function () {
        describe('create()', function () {
          describe('when called without arguments', function () {
            it('should throw', function () {
              expect(
                // @ts-expect-error - invalid args
                () => PluginMetadata.create(),
                'to throw',
                {code: ErrorCode.InvalidArgError},
              );
            });
          });

          describe('when called with an entryPoint', function () {
            describe('when the entry point is an absolute path', function () {
              it('should return a PluginMetadata instance with the id as a relative path', function () {
                const metadata = PluginMetadata.create(TEST_ENTRYPOINT);
                expect(metadata, 'to be a', PluginMetadata).and('to satisfy', {
                  id: TEST_ID,
                });
              });

              describe('when called with an id', function () {
                it('should return a PluginMetadata instance with the provided id', function () {
                  const metadata = PluginMetadata.create(
                    TEST_ENTRYPOINT,
                    'pentryOint.js',
                  );
                  expect(metadata, 'to be a', PluginMetadata).and(
                    'to satisfy',
                    {
                      id: 'pentryOint.js',
                    },
                  );
                });
              });
            });

            describe('when the entry point is a relative path', function () {
              it('should throw', function () {
                expect(
                  () => PluginMetadata.create('entryPoint.js'),
                  'to throw',
                  {code: ErrorCode.ZodValidationError},
                );
              });
            });
          });

          describe('when called with a valid PluginMetadataOpts object', function () {
            it('should return a PluginMetadata instance', function () {
              const metadata = PluginMetadata.create({
                entryPoint: TEST_ENTRYPOINT,
                id: 'something-else',
                pkgJson: {name: 'foo', version: '1.0.0'},
                requestedAs: 'something',
              });
              expect(metadata, 'to be a', PluginMetadata);
            });

            describe('when the options contains no "id" prop', function () {
              describe('when the "pkgJson" prop is a reasonable PackageJson object', function () {
                it('should return a PluginInstance with the package name as its id', function () {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const {entryPoint, pkgJson, ...rest} = TEST_OPTS;
                  const metadata = PluginMetadata.create({
                    entryPoint,
                    pkgJson,
                  });
                  expect(metadata, 'to be a', PluginMetadata).and(
                    'to satisfy',
                    {
                      id: 'snuckles',
                    },
                  );
                });
              });

              describe('when the "pkgJson" prop is invalid', function () {
                it('should throw', function () {
                  const {entryPoint} = TEST_OPTS;
                  expect(
                    () =>
                      // @ts-expect-error bad type
                      PluginMetadata.create({
                        entryPoint,
                        pkgJson: {},
                      }),
                    'to throw',
                    {code: ErrorCode.ZodValidationError},
                  );
                });
              });
            });
          });
        });

        describe('createTransient()', function () {
          describe('when provided no arguments', function () {
            it('should throw', function () {
              expect(
                // @ts-expect-error - bad args
                () => PluginMetadata.createTransient(),
                'to throw',
                {code: ErrorCode.InvalidArgError},
              );
            });
          });

          describe('when provided a plugin name argument', function () {
            it('should return a PluginMetadata instance with a special entry point', function () {
              const metadata = PluginMetadata.createTransient('snuckles');
              expect(metadata, 'to be a', PluginMetadata).and('to satisfy', {
                entryPoint: TRANSIENT,
              });
            });
          });
        });
      });
    });
  });
});
