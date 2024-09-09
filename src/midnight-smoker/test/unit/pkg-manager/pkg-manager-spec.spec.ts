import {PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {SemVer} from 'semver';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('package manager', function () {
      describe('PkgManagerSpec', function () {
        let sandbox: sinon.SinonSandbox;

        beforeEach(function () {
          sandbox = createSandbox();
        });

        afterEach(function () {
          sandbox.restore();
        });

        describe('constructor', function () {
          describe('when the package manager is known', function () {
            describe('when the version is valid', function () {
              it('should create a PkgManagerSpec with provided values', function () {
                expect(
                  new PkgManagerSpec({
                    name: 'npm',
                    version: '7.0.0',
                  }),
                  'to satisfy',
                  {
                    hasSemVer: true,
                    isSystem: false,
                    name: 'npm',
                    version: '7.0.0',
                  },
                );
              });

              describe('when the version is a SemVer', function () {
                it('should create a PkgManagerSpec with provided values', function () {
                  expect(
                    new PkgManagerSpec({
                      name: 'npm',
                      version: new SemVer('7.0.0'),
                    }),
                    'to satisfy',
                    {
                      hasSemVer: true,
                      isSystem: false,
                      name: 'npm',
                      version: '7.0.0',
                    },
                  );
                });
              });
            });

            describe('when the version is invalid', function () {
              it('should consider it a dist-tag', function () {
                expect(
                  new PkgManagerSpec({
                    name: 'npm',
                    version: 'foo',
                  }),
                  'to satisfy',
                  {
                    hasSemVer: false,
                    isSystem: false,
                    name: 'npm',
                    version: 'foo',
                  },
                );
              });
            });
          });
        });

        describe('computed property', function () {
          let spec: Readonly<PkgManagerSpec>;

          describe('isValid', function () {
            describe('when the package manager is known and the version is valid', function () {
              beforeEach(function () {
                spec = PkgManagerSpec.create('npm@7.0.0');
              });

              it('should be true', function () {
                expect(spec.hasSemVer, 'to be true');
              });
            });

            describe('when the package manager is unknown', function () {
              beforeEach(function () {
                spec = PkgManagerSpec.create('foo@bar');
              });

              it('should be false', function () {
                expect(spec.hasSemVer, 'to be false');
              });
            });
          });

          describe('semver', function () {
            describe('when the package manager is known and the version is valid', function () {
              beforeEach(function () {
                spec = PkgManagerSpec.create('npm@7.0.0');
              });

              it('should be a SemVer', function () {
                expect(spec.semver, 'to be a', SemVer);
              });
            });

            describe('when the package manager is unknown', function () {
              beforeEach(function () {
                spec = PkgManagerSpec.create('foo@bar');
              });

              it('should be undefined', function () {
                expect(spec.semver, 'to be undefined');
              });
            });
          });

          describe('isSystem', function () {
            it('should be true when "bin" is present"', function () {
              expect(
                new PkgManagerSpec({
                  bin: 'npm',
                  name: 'npm',
                  version: 'foo',
                }).isSystem,
                'to be true',
              );
            });

            describe('when coerced to a string', function () {
              describe('when the version is valid', function () {
                it('should print a string with the version and a "(system)" suffix', function () {
                  expect(
                    String(
                      new PkgManagerSpec({
                        bin: 'npm',
                        name: 'npm',
                        version: '7.0.0',
                      }),
                    ),
                    'to equal',
                    'npm@7.0.0 (system)',
                  );
                });
              });

              describe('when provided a dist-tag', function () {
                it('should print a string without the version and a "(system)" suffix', function () {
                  expect(
                    String(
                      new PkgManagerSpec({
                        bin: 'npm',
                        name: 'npm',
                        version: 'latest',
                      }),
                    ),
                    'to match',
                    /^npm \(system\)$/,
                  );
                });
              });

              describe('when the version is invalid', function () {
                it('should print a string without the version and a "(system)" suffix', function () {
                  expect(
                    String(
                      new PkgManagerSpec({
                        bin: '/usr/bin/foo',
                        name: 'foo',
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
            let spec: Readonly<PkgManagerSpec>;

            beforeEach(function () {
              spec = PkgManagerSpec.create('npm@7.0.0');
            });

            it('should create a new PkgManagerSpec with the same properties', function () {
              const clone = spec.clone();
              expect(clone, 'to satisfy', {
                bin: spec.bin,
                hasSemVer: spec.hasSemVer,
                isSystem: spec.isSystem,
                label: spec.label,
                name: spec.name,
                version: spec.version,
              });
            });

            it('should override properties with provided options', function () {
              const clone = spec.clone({name: 'yarn', version: '1.22.0'});
              expect(clone, 'to satisfy', {
                bin: spec.bin,
                hasSemVer: spec.hasSemVer,
                isSystem: spec.isSystem,
                label: 'yarn@1.22.0',
                name: 'yarn',
                version: '1.22.0',
              });
            });

            it('should not modify the original PkgManagerSpec', function () {
              const original = {...spec};
              spec.clone({bin: 'yarn', version: '1.22.0'});
              expect(spec, 'to satisfy', original);
            });
          });

          describe('toJSON()', function () {
            let spec: Readonly<PkgManagerSpec>;

            beforeEach(function () {
              spec = PkgManagerSpec.create('npm@7.0.0');
            });

            it('should return a StaticPkgManagerSpec', function () {
              const json = spec.toJSON();
              expect(json, 'to exhaustively satisfy', {
                bin: spec.bin,
                label: spec.label,
                name: spec.name,
                requestedAs: spec.requestedAs,
                version: spec.version,
              });
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
            let spec: Readonly<PkgManagerSpec>;

            describe('when the package manager is known and the version is valid', function () {
              beforeEach(function () {
                spec = PkgManagerSpec.create('npm@7.0.0');
              });

              it('should return a string with the package manager and version', function () {
                expect(spec.toString(), 'to equal', 'npm@7.0.0');
              });

              describe('when isSystem is true', function () {
                it('should append a "(system)" suffix', function () {
                  const systemSpec = new PkgManagerSpec({
                    bin: 'npm',
                    name: 'npm',
                    version: '7.0.0',
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
                spec = new PkgManagerSpec({name: 'bar', version: 'foo'});
              });

              it('should return a string with the name and version', function () {
                expect(spec.toString(), 'to equal', 'bar@foo');
              });

              describe('when isSystem is true', function () {
                it('should not contain the version and should append a "(system)" suffix', function () {
                  const systemSpec = new PkgManagerSpec({
                    bin: 'bar',
                    name: 'bar',
                    version: 'foo',
                  });
                  expect(systemSpec.toString(), 'to equal', 'bar (system)');
                });
              });
            });
          });
        });

        describe('static method', function () {
          describe('filterUnsupported()', function () {
            let specs: Readonly<PkgManagerSpec>[];
            let desiredPkgManagers: string[];

            beforeEach(function () {
              desiredPkgManagers = ['npm@7', 'yarn@1', 'foo@bar'];
              // @ts-expect-error - urgh, decorators
              PkgManagerSpec.create.cache = new Map();
              specs = [
                PkgManagerSpec.create('npm@7.0.0', {
                  requestedAs: 'npm@7',
                }),
                PkgManagerSpec.create('yarn@1.22.10', {
                  requestedAs: 'yarn@1',
                }),
                PkgManagerSpec.create('foo@bar', {
                  requestedAs: 'foo@bar',
                }),
              ];
            });

            describe('when no desired package managers provided', function () {
              it('should return an empty array', function () {
                expect(PkgManagerSpec.filterUnsupported(specs), 'to be empty');
              });
            });

            describe('when all desired package managers provided', function () {
              it('should return an empty array', function () {
                expect(
                  PkgManagerSpec.filterUnsupported(specs, desiredPkgManagers),
                  'to be empty',
                );
              });
            });

            describe('when not all desired package managers provided', function () {
              it('should return a non-empty array', function () {
                expect(
                  PkgManagerSpec.filterUnsupported(specs, [
                    ...desiredPkgManagers,
                    'bar@foo',
                  ]),
                  'to equal',
                  ['bar@foo'],
                );
              });
            });

            describe('when no specs provided', function () {
              it('should return the desired package managers', function () {
                expect(
                  PkgManagerSpec.filterUnsupported([], desiredPkgManagers),
                  'to equal',
                  desiredPkgManagers,
                );
              });
            });
          });

          describe('create()', function () {
            describe('when no arguments are provided', function () {
              it('should throw');
            });

            describe('when the package manager is known', function () {
              describe('when the version is valid', function () {
                it('should create a PkgManagerSpec with provided values', function () {
                  expect(
                    PkgManagerSpec.create({
                      name: 'npm',
                      version: '7.0.0',
                    }),
                    'to satisfy',
                    {
                      hasSemVer: true,
                      isSystem: false,
                      name: 'npm',
                      version: '7.0.0',
                    },
                  );
                });
              });

              describe('when the version is a SemVer object', function () {
                it('should convert the version to a string', function () {
                  const version = new SemVer('7.0.0');
                  const spec = PkgManagerSpec.create({
                    name: 'npm',
                    version,
                  });
                  expect(spec.version, 'to be a string').and(
                    'to equal',
                    '7.0.0',
                  );
                });
              });
            });
          });
        });
      });
    });
  });
});
