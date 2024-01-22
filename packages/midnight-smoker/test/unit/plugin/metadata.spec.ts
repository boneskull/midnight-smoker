import path from 'node:path';
import rewiremock from 'rewiremock/node';
import type {PackageJson} from 'type-fest';
import unexpected from 'unexpected';
import {isValidationError} from 'zod-validation-error';
import {InvalidArgError} from '../../../src/error/common-error';
import type * as PM from '../../../src/plugin/metadata';
import {createFsMocks} from '../mocks/fs';

const expect = unexpected.clone();

const TEST_ENTRYPOINT = path.join(process.cwd(), 'entryPoint.js');
const TEST_ID = path.basename(TEST_ENTRYPOINT);
const TEST_OPTS = {
  entryPoint: TEST_ENTRYPOINT,
  requestedAs: TEST_ENTRYPOINT,
  pkgJson: {name: 'snuckles', version: '1.0.0', description: 'poor snuckles'},
};

describe('midnight-smoker', function () {
  describe('plugin', function () {
    describe('PluginMetadata', function () {
      let TRANSIENT: typeof PM.TRANSIENT;
      let PluginMetadata: typeof PM.PluginMetadata;

      beforeEach(function () {
        const {mocks} = createFsMocks();

        ({PluginMetadata, TRANSIENT} = rewiremock.proxy(
          () => require('../../../src/plugin/metadata'),
          mocks,
        ));
      });

      describe('instance method', function () {
        let metadata: PM.PluginMetadata;

        beforeEach(function () {
          metadata = PluginMetadata.create(TEST_OPTS);
        });

        describe('toJSON()', function () {
          it('should return a StaticPluginMetadata object', function () {
            expect(metadata.toJSON(), 'to satisfy', {
              id: 'snuckles',
              version: '1.0.0',
              description: 'poor snuckles',
            });
          });
        });

        describe('toString()', function () {
          describe('when the "pkgJson" prop has a "version" prop', function () {
            it('should return a description of the plugin containing the version', function () {
              expect(metadata.toString(), 'to match', /snuckles@1\.0\.0 (.+)/);
            });
          });

          describe('when the "pkgJson" prop has no "version" prop', function () {
            it('should return a description of the plugin without the version', function () {
              const metadata = PluginMetadata.create({
                entryPoint: TEST_ENTRYPOINT,
                pkgJson: {name: 'snuckles'},
              });
              expect(metadata.toString(), 'to match', /snuckles (.+)/);
            });
          });
        });

        describe('addScriptRunner()', function () {
          describe('when attempting to add a script runner with the same name as an existing script runner', function () {
            it('should throw', function () {
              expect(
                () => {
                  metadata.addScriptRunner('foo', {} as any);
                  metadata.addScriptRunner('foo', {} as any);
                },
                'to throw',
                /already exists in/,
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
                'to throw an',
                InvalidArgError,
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
                  expect.it(
                    'when passed as parameter to',
                    isValidationError,
                    'to be true',
                  ),
                );
              });
            });
          });

          describe('when called with a valid PluginMetadataOpts object', function () {
            it('should return a PluginMetadata instance', function () {
              const metadata = PluginMetadata.create({
                entryPoint: TEST_ENTRYPOINT,
                id: 'something-else',
                requestedAs: 'something',
                pkgJson: {} as PackageJson,
              });
              expect(metadata, 'to be a', PluginMetadata);
            });

            describe('when the options contains no "id" prop', function () {
              describe('when the "pkgJson" prop is a reasonable PackageJson object', function () {
                it('should return a PluginInstance with the package name as its id', function () {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const {entryPoint, pkgJson, ...rest} = TEST_OPTS;
                  const metadata = PluginMetadata.create({entryPoint, pkgJson});
                  expect(metadata, 'to be a', PluginMetadata).and(
                    'to satisfy',
                    {
                      id: 'snuckles',
                    },
                  );
                });
              });

              describe('when the "pkgJson" prop is not a reasonable PackageJson object', function () {
                it('should return a PluginInstance containing a relative path to "entryPoint" as its id', function () {
                  const {entryPoint} = TEST_OPTS;
                  const metadata = PluginMetadata.create({
                    entryPoint,
                    pkgJson: {},
                  });
                  expect(metadata, 'to be a', PluginMetadata).and(
                    'to satisfy',
                    {
                      id: TEST_ID,
                    },
                  );
                });
              });
            });
          });

          describe('when called with an invalid object', function () {
            it('should throw', function () {
              expect(
                () =>
                  // @ts-expect-error - bad type
                  PluginMetadata.create({
                    entryPoint: TEST_ENTRYPOINT,
                    pkgJson: [], // <-- no
                  }),
                'to throw',
                expect.it(
                  'when passed as parameter to',
                  isValidationError,
                  'to be true',
                ),
              );
            });
          });
        });

        describe('createTransient()', function () {
          describe('when provided no arguments', function () {
            it('should throw', function () {
              expect(
                // @ts-expect-error - bad args
                () => PluginMetadata.createTransient(),
                'to throw an',
                InvalidArgError,
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
