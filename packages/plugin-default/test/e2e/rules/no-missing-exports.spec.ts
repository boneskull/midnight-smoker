import {
  createRuleRunner,
  type NamedRuleRunner,
} from '@midnight-smoker/test-util';
import {FAILED, OK} from 'midnight-smoker/constants';
import {normalize} from 'node:path';
import unexpected from 'unexpected';

import noMissingExports from '../../../src/rules/no-missing-exports';

const expect = unexpected.clone();

describe('@midnight-smoker/plugin-default', function () {
  describe('rule', function () {
    describe('no-missing-exports', function () {
      const name = 'no-missing-exports';
      let runRule: NamedRuleRunner;

      before(async function () {
        runRule = await createRuleRunner(noMissingExports, name);
      });

      describe('when the package contains no "exports" field', function () {
        const fixture = normalize(
          `${__dirname}/fixture/no-missing-exports-no-exports`,
        );

        it('should not return a failure', async function () {
          await expect(
            runRule(fixture),
            'to be fulfilled with value satisfying',
            {type: OK},
          );
        });
      });

      describe('when the package contains a string "exports" field', function () {
        describe('when the file is missing', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-exports-main-export`,
          );

          it('should return a single failure for the missing file', async function () {
            await expect(
              runRule(fixture),
              'to be fulfilled with value satisfying',
              {
                result: [
                  {
                    message: /\.\/index\.js unreadable at field exports$/,
                    rule: {name},
                    type: FAILED,
                  },
                ],
              },
            );
          });
        });

        describe('when the file is present', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-exports-main-export-ok`,
          );

          it('should not return a failure', async function () {
            await expect(
              runRule(fixture),
              'to be fulfilled with value satisfying',
              {type: OK},
            );
          });
        });
      });

      describe('when the package contains subpath "exports" field', function () {
        describe('when a file is missing', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-exports-subpath`,
          );

          it('should return a failure', async function () {
            await expect(
              runRule(fixture),
              'to be fulfilled with value satisfying',
              {
                result: [
                  {
                    message:
                      /\.\/index-missing\.js unreadable at field exports\["\.\/missing\.js"\]$/,
                    rule: {name},
                  },
                ],
              },
            );
          });
        });

        describe('when no files are missing', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-exports-subpath-ok`,
          );

          it('should not return a failure', async function () {
            await expect(
              runRule(fixture),
              'to be fulfilled with value satisfying',
              {type: OK},
            );
          });
        });

        describe('when a glob pattern is present', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-exports-glob`,
          );

          describe('when all files are missing', function () {
            it('should return a failure', async function () {
              await expect(
                runRule(fixture),
                'to be fulfilled with value satisfying',
                {
                  result: [
                    {
                      message:
                        'Export exports["./*.js"] matches no files using glob: ./lib/*.js',
                    },
                  ],
                },
              );
            });
          });

          describe('when at least one file matches the glob pattern', function () {
            const fixture = normalize(
              `${__dirname}/fixture/no-missing-exports-glob-ok`,
            );

            it('should not return a failure', async function () {
              await expect(
                runRule(fixture),
                'to be fulfilled with value satisfying',
                {type: OK},
              );
            });
          });

          describe('when glob patterns are disallowed', function () {
            const fixture = normalize(
              `${__dirname}/fixture/no-missing-exports-no-glob`,
            );

            it('should return a failure', async function () {
              await expect(
                runRule(fixture, {glob: false}),
                'to be fulfilled with value satisfying',
                {
                  result: [
                    {
                      message:
                        'Export exports["./*.js"] contains a glob pattern; glob patterns are disallowed by rule options',
                    },
                  ],
                },
              );
            });
          });
        });
      });

      describe('when the package contains conditional "exports" field', function () {
        describe('when a file is missing', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-exports-conditional`,
          );

          it('should return a failure', async function () {
            await expect(
              runRule(fixture, {packageJson: false}),
              'to be fulfilled with value satisfying',
              {
                result: [
                  {
                    message:
                      './index-missing.js unreadable at field exports.require',
                    rule: {name},
                  },
                ],
              },
            );
          });
        });

        describe('when the value is an array', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-exports-conditional-array`,
          );

          it('should return a failure', async function () {
            await expect(
              runRule(fixture, {packageJson: false}),
              'to be fulfilled with value satisfying',
              {
                result: [
                  {
                    message:
                      './index-missing.js unreadable at field exports.default[1]',
                    rule: {name},
                  },
                ],
              },
            );
          });
        });

        describe('when no files are missing', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-exports-conditional-ok`,
          );

          it('should not return a failure', async function () {
            await expect(
              runRule(fixture, {packageJson: false}),
              'to be fulfilled with value satisfying',
              {type: OK},
            );
          });

          describe('when a "require" export is present', function () {
            const fixture = normalize(
              `${__dirname}/fixture/no-missing-exports-require`,
            );

            describe('when the file is ESM', function () {
              it('should return a failure', async function () {
                await expect(
                  runRule(fixture, {packageJson: false}),
                  'to be fulfilled with value satisfying',
                  {
                    result: [
                      {
                        message:
                          './index.js is not a CommonJS script at field exports.require',
                        rule: {name},
                      },
                    ],
                  },
                );
              });
            });
          });

          describe('when an "import" export is present', function () {
            const fixture = normalize(
              `${__dirname}/fixture/no-missing-exports-import`,
            );

            describe('when the file is not ESM', function () {
              it('should return a failure', async function () {
                await expect(
                  runRule(fixture, {packageJson: false}),
                  'to be fulfilled with value satisfying',
                  {
                    result: [
                      {
                        message:
                          './index.js is not an EcmaScript module at field exports.import',
                        rule: {name},
                      },
                    ],
                  },
                );
              });
            });
          });

          describe('when an "types" export is present', function () {
            const fixture = normalize(
              `${__dirname}/fixture/no-missing-exports-types`,
            );

            describe('when the file does not have a .d.ts extension', function () {
              it('should return a failure', async function () {
                await expect(
                  runRule(fixture, {packageJson: false}),
                  'to be fulfilled with value satisfying',
                  {
                    result: [
                      {
                        message:
                          './index.js is not a .d.ts file at field exports.types',
                        rule: {name},
                      },
                    ],
                  },
                );
              });
            });
          });

          describe('when a "default" export is present', function () {
            describe('when it does not appear last in the "exports" obejct', function () {
              const fixture = normalize(
                `${__dirname}/fixture/no-missing-exports-default`,
              );

              it('should return a failure', async function () {
                await expect(
                  runRule(fixture, {packageJson: false}),
                  'to be fulfilled with value satisfying',
                  {
                    result: [
                      {
                        message: /must be the last export$/,
                        rule: {name},
                      },
                    ],
                  },
                );
              });
            });

            describe('when it appears last in the "exports" object', function () {
              const fixture = normalize(
                `${__dirname}/fixture/no-missing-exports-default-ok`,
              );

              it('should not return a failure', async function () {
                await expect(
                  runRule(fixture, {packageJson: false}),
                  'to be fulfilled with value satisfying',
                  {type: OK},
                );
              });
            });

            describe('when the "order" option is disabled', function () {
              const fixture = normalize(
                `${__dirname}/fixture/no-missing-exports-default`,
              );

              it('should not return a failure', async function () {
                await expect(
                  runRule(fixture, {order: false, packageJson: false}),
                  'to be fulfilled with value satisfying',
                  {type: OK},
                );
              });
            });
          });
        });
      });

      describe('when the package contains an array "exports" field', function () {
        describe('when a file is missing', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-exports-array`,
          );

          it('should return a failure', async function () {
            await expect(
              runRule(fixture),
              'to be fulfilled with value satisfying',
              {type: FAILED},
            );
          });
        });
      });
    });
  });
});
