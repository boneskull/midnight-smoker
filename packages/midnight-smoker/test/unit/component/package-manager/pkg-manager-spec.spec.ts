import rewiremock from 'rewiremock/node';
import {SemVer} from 'semver';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import type * as PMS from '../../../../src/component/pkg-manager/pkg-manager-spec';
import {DEFAULT_PKG_MANAGER_BIN} from '../../../../src/constants';
import {type getSystemPkgManagerVersion} from '../../../../src/util/pkg-util';
import {createFsMocks} from '../../mocks/fs';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('package manager', function () {
      describe('PkgManagerSpec', function () {
        let sandbox: sinon.SinonSandbox;
        let PkgManagerSpec: typeof PMS.PkgManagerSpec;
        let getSystemPkgManagerVersionStub: sinon.SinonStubbedMember<
          typeof getSystemPkgManagerVersion
        >;
        beforeEach(function () {
          sandbox = createSandbox();
          const {mocks} = createFsMocks();
          getSystemPkgManagerVersionStub = sandbox
            .stub<[string], Promise<string>>()
            .resolves('1.22.10');
          ({PkgManagerSpec} = rewiremock.proxy(
            () =>
              require('../../../../src/component/pkg-manager/pkg-manager-spec'),
            {
              ...mocks,
              '../../../../src/util/pkg-util': {
                getSystemPkgManagerVersion: getSystemPkgManagerVersionStub,
              },
            },
          ));
        });

        afterEach(function () {
          sandbox.restore();
        });

        describe('constructor', function () {
          describe('when no arguments are provided', function () {
            it('should create a valid PkgManagerSpec with defaults applied', function () {
              expect(new PkgManagerSpec(), 'to satisfy', {
                pkgManager: DEFAULT_PKG_MANAGER_BIN,
                version: expect.it('to be a string'),
                isValid: true,
                isSystem: false,
              });
            });
          });

          describe('when the package manager is known', function () {
            describe('when the version is valid', function () {
              it('should create a PkgManagerSpec with provided values', function () {
                expect(
                  new PkgManagerSpec({pkgManager: 'npm', version: '7.0.0'}),
                  'to satisfy',
                  {
                    pkgManager: 'npm',
                    version: '7.0.0',
                    isValid: true,
                    isSystem: false,
                  },
                );
              });

              describe('when the version is a SemVer', function () {
                it('should create a PkgManagerSpec with provided values', function () {
                  expect(
                    new PkgManagerSpec({
                      pkgManager: 'npm',
                      version: new SemVer('7.0.0'),
                    }),
                    'to satisfy',
                    {
                      pkgManager: 'npm',
                      version: '7.0.0',
                      isValid: true,
                      isSystem: false,
                    },
                  );
                });
              });
            });

            describe('when the version is invalid', function () {
              it('should consider it a dist-tag and throw', function () {
                expect(
                  () => new PkgManagerSpec({pkgManager: 'npm', version: 'foo'}),
                  'to throw',
                  {
                    code: 'ESMOKER_UNKNOWNDISTTAG',
                  },
                );
              });
            });
          });
        });

        describe('computed property', function () {
          let spec: Readonly<PMS.PkgManagerSpec>;

          describe('isValid', function () {
            describe('when the package manager is known and the version is valid', function () {
              beforeEach(async function () {
                spec = await PkgManagerSpec.from('npm@7.0.0');
              });

              it('should be true', function () {
                expect(spec.isValid, 'to be true');
              });
            });

            describe('when the package manager is unknown', function () {
              beforeEach(async function () {
                spec = await PkgManagerSpec.from('foo@bar');
              });

              it('should be false', function () {
                expect(spec.isValid, 'to be false');
              });
            });
          });

          describe('semver', function () {
            describe('when the package manager is known and the version is valid', function () {
              beforeEach(async function () {
                spec = await PkgManagerSpec.from('npm@7.0.0');
              });

              it('should be a SemVer', function () {
                expect(spec.semver, 'to be a', SemVer);
              });
            });

            describe('when the package manager is unknown', function () {
              beforeEach(async function () {
                spec = await PkgManagerSpec.from('foo@bar');
              });

              it('should be undefined', function () {
                expect(spec.semver, 'to be undefined');
              });
            });
          });

          describe('isSystem', function () {
            it('should be false by default', function () {
              expect(new PkgManagerSpec().isSystem, 'to be false');
            });

            it('should be true when specified in constructor', function () {
              expect(
                new PkgManagerSpec({isSystem: true}).isSystem,
                'to be true',
              );
            });

            describe('when coerced to a string', function () {
              describe('when the version is valid', function () {
                it('should print a string with the version and a "(system)" suffix', function () {
                  expect(
                    String(
                      new PkgManagerSpec({
                        pkgManager: 'npm',
                        isSystem: true,
                        version: '7.0.0',
                      }),
                    ),
                    'to equal',
                    'npm@7.0.0 (system)',
                  );
                });
              });

              describe('when provided a dist-tag normalized to a valid version', function () {
                it('should print a string with the version and a "(system)" suffix', function () {
                  expect(
                    String(
                      new PkgManagerSpec({
                        pkgManager: 'npm',
                        isSystem: true,
                        version: 'latest',
                      }),
                    ),
                    'to match',
                    /^npm@\d+\.\d+\.\d+ \(system\)$/,
                  );
                });
              });

              describe('when the version is invalid', function () {
                it('should print a string without the version and a "(system)" suffix', function () {
                  expect(
                    String(
                      new PkgManagerSpec({
                        pkgManager: 'foo',
                        isSystem: true,
                        version: 'bar',
                      }),
                    ),
                    'to equal',
                    'foo (system)',
                  );
                });
              });
            });
          });
        });

        describe('method', function () {
          describe('clone()', function () {
            let spec: Readonly<PMS.PkgManagerSpec>;

            beforeEach(async function () {
              spec = await PkgManagerSpec.from('npm@7.0.0');
            });

            it('should create a new PkgManagerSpec with the same properties', function () {
              const clone = spec.clone();
              expect(clone, 'to satisfy', {
                pkgManager: spec.pkgManager,
                version: spec.version,
                isValid: spec.isValid,
                isSystem: spec.isSystem,
              });
            });

            it('should override properties with provided options', function () {
              const clone = spec.clone({pkgManager: 'yarn', version: '1.22.0'});
              expect(clone, 'to satisfy', {
                pkgManager: 'yarn',
                version: '1.22.0',
                isValid: true,
                isSystem: false,
              });
            });

            it('should not modify the original PkgManagerSpec', function () {
              const original = {...spec};
              spec.clone({pkgManager: 'yarn', version: '1.22.0'});
              expect(spec, 'to satisfy', original);
            });
          });

          describe('toJSON()', function () {
            let spec: Readonly<PMS.PkgManagerSpec>;

            beforeEach(async function () {
              spec = await PkgManagerSpec.from('npm@7.0.0');
            });

            it('should return an object with the same properties', function () {
              const json = spec.toJSON();
              expect(json, 'to satisfy', {
                pkgManager: spec.pkgManager,
                version: spec.version,
                isSystem: spec.isSystem,
              });
            });

            it('should not return an object with a semver property', function () {
              const json = spec.toJSON();
              expect(json, 'not to have property', 'semver');
            });

            it('should not return an object with an isValid property', function () {
              const json = spec.toJSON();
              expect(json, 'not to have property', 'isValid');
            });

            it('should return a plain object', function () {
              const json = spec.toJSON();
              expect(json, 'to be an', Object).and(
                'not to be a',
                PkgManagerSpec,
              );
            });
          });

          describe('toString()', function () {
            let spec: Readonly<PMS.PkgManagerSpec>;

            describe('when the package manager is known and the version is valid', function () {
              beforeEach(async function () {
                spec = await PkgManagerSpec.from('npm@7.0.0');
              });

              it('should return a string with the package manager and version', function () {
                expect(spec.toString(), 'to equal', 'npm@7.0.0');
              });

              describe('when isSystem is true', function () {
                it('should append a "(system)" suffix', function () {
                  const systemSpec = new PkgManagerSpec({
                    pkgManager: 'npm',
                    version: '7.0.0',
                    isSystem: true,
                  });
                  expect(
                    systemSpec.toString(),
                    'to equal',
                    'npm@7.0.0 (system)',
                  );
                });
              });
            });

            describe('when the package manager is unknown and the version is invalid', function () {
              beforeEach(async function () {
                spec = new PkgManagerSpec({pkgManager: 'bar', version: 'foo'});
              });

              it('should return a string with the name and version', function () {
                expect(spec.toString(), 'to equal', 'bar@foo');
              });

              describe('when isSystem is true', function () {
                it('should not contain the version and should append a "(system)" suffix', function () {
                  const systemSpec = new PkgManagerSpec({
                    pkgManager: 'bar',
                    version: 'foo',
                    isSystem: true,
                  });
                  expect(systemSpec.toString(), 'to equal', 'bar (system)');
                });
              });
            });
          });
        });

        describe('static method', function () {
          describe('create()', function () {
            describe('when no arguments are provided', function () {
              it('should create a valid PkgManagerSpec with defaults applied', function () {
                expect(PkgManagerSpec.create(), 'to satisfy', {
                  pkgManager: DEFAULT_PKG_MANAGER_BIN,
                  version: expect.it('to match', /^\d+\.\d+\.\d+$/),
                  isValid: true,
                  isSystem: false,
                });
              });
            });

            describe('when the package manager is known', function () {
              describe('when the version is valid', function () {
                it('should create a PkgManagerSpec with provided values', function () {
                  expect(
                    PkgManagerSpec.create({
                      pkgManager: 'npm',
                      version: '7.0.0',
                    }),
                    'to satisfy',
                    {
                      pkgManager: 'npm',
                      version: '7.0.0',
                      isValid: true,
                      isSystem: false,
                    },
                  );
                });
              });

              describe('when the version is a SemVer object', function () {
                it('should convert the version to a string', function () {
                  const version = new SemVer('7.0.0');
                  const spec = PkgManagerSpec.create({
                    pkgManager: 'npm',
                    version,
                  });
                  expect(spec.version, 'to be a string').and(
                    'to equal',
                    '7.0.0',
                  );
                });
              });
            });

            describe('when isSystem is true', function () {
              it('should create a PkgManagerSpec with isSystem set to true', function () {
                expect(PkgManagerSpec.create({isSystem: true}), 'to satisfy', {
                  isSystem: true,
                });
              });
            });
          });

          describe('from()', function () {
            describe('when the argument is an instance of PkgManagerSpec', function () {
              it('should return a clone of the instance', async function () {
                const spec = new PkgManagerSpec({
                  pkgManager: 'npm',
                  version: '7.0.0',
                });
                const result = await PkgManagerSpec.from(spec);
                expect(result, 'to satisfy', {...spec}).and('not to be', spec);
              });
            });

            describe('when the argument is a string', function () {
              it('should parse the string and create a PkgManagerSpec', async function () {
                const result = await PkgManagerSpec.from('npm@7.0.0');
                expect(result, 'to satisfy', {
                  pkgManager: 'npm',
                  version: '7.0.0',
                });
              });

              describe('when the argument is just a name', function () {
                it('should parse the string and create a PkgManagerSpec', async function () {
                  const result = await PkgManagerSpec.from('pnpm');
                  expect(result, 'to satisfy', {
                    pkgManager: 'pnpm',
                    version: 'latest',
                  });
                });
              });

              describe('when the second argument is true', function () {
                it('should set the isSystem flag to true', async function () {
                  const result = await PkgManagerSpec.from('npm@7.0.0', true);
                  expect(result.isSystem, 'to be true');
                });
              });
            });

            describe('when the argument is an options object', function () {
              it('should create a PkgManagerSpec with the provided options', async function () {
                const result = await PkgManagerSpec.from({
                  pkgManager: 'yarn',
                  version: '1.22.10',
                });
                expect(result, 'to satisfy', {
                  pkgManager: 'yarn',
                  version: '1.22.10',
                });
              });

              it('should use default values for missing options', async function () {
                const result = await PkgManagerSpec.from({});
                expect(result, 'to satisfy', {
                  pkgManager: DEFAULT_PKG_MANAGER_BIN,
                  version: expect.it('to match', /^\d+\.\d+\.\d+$/),
                });
              });

              it('should get the system package manager version when isSystem is true', async function () {
                await PkgManagerSpec.from({
                  pkgManager: 'yarn',
                  isSystem: true,
                });
                expect(getSystemPkgManagerVersionStub, 'was called once');
              });
            });
          });

          describe('parse()', function () {
            describe('when the string contains an @', function () {
              it('should return a tuple, split on @', function () {
                const result = PkgManagerSpec.parse('npm@7.0.0');
                expect(result, 'to equal', ['npm', '7.0.0']);
              });
            });

            describe('when the string does not contain an @', function () {
              it('should return a tuple with an undefined version', function () {
                const result = PkgManagerSpec.parse('herp');
                expect(result, 'to equal', ['herp', undefined]);
              });
            });
          });
        });
      });
    });
  });
});
