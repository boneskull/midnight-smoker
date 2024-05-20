import {
  createRuleRunner,
  type NamedRuleRunner,
} from '@midnight-smoker/test-util';
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
          await expect(runRule(fixture), 'to be fulfilled with', undefined);
        });
      });

      describe('when the package contains a string "exports" field', function () {
        describe('when the file is missing', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-exports-main-export`,
          );

          it('should return a failure', async function () {
            await expect(
              runRule(fixture),
              'to be fulfilled with value satisfying',
              [
                {
                  rule: name,
                  message: /.exports. unreadable at path: \.\/index\.js$/,
                },
              ],
            );
          });
        });

        describe('when the file is present', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-exports-main-export-ok`,
          );

          it('should not return a failure', async function () {
            await expect(runRule(fixture), 'to be fulfilled with', undefined);
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
              [
                {
                  rule: name,
                  message:
                    /\.\/missing\.js. unreadable at path: \.\/index-missing\.js$/,
                },
              ],
            );
          });
        });

        describe('when no files are missing', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-exports-subpath-ok`,
          );

          it('should not return a failure', async function () {
            await expect(runRule(fixture), 'to be fulfilled with', undefined);
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
                [
                  {
                    message:
                      /\.\/\*\.js. matches no files using glob: \.\/lib\/\*\.js$/,
                  },
                ],
              );
            });
          });

          describe('when at least one file matches the glob pattern', function () {
            const fixture = normalize(
              `${__dirname}/fixture/no-missing-exports-glob-ok`,
            );

            it('should not return a failure', async function () {
              await expect(runRule(fixture), 'to be fulfilled with', undefined);
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
                [
                  {
                    message: /\.\/\*\.js. contains a glob pattern$/,
                  },
                ],
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
              runRule(fixture),
              'to be fulfilled with value satisfying',
              [
                {
                  rule: name,
                  message:
                    /require. unreadable at path: \.\/index-missing\.js$/,
                },
              ],
            );
          });
        });

        describe('when the value is an array', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-exports-conditional-array`,
          );

          it('should return a failure', async function () {
            await expect(
              runRule(fixture),
              'to be fulfilled with value satisfying',
              [
                {
                  rule: name,
                  message: /\[1\]. unreadable at path: \.\/index-missing\.js$/,
                },
              ],
            );
          });
        });

        describe('when no files are missing', function () {
          const fixture = normalize(
            `${__dirname}/fixture/no-missing-exports-conditional-ok`,
          );

          it('should not return a failure', async function () {
            await expect(runRule(fixture), 'to be fulfilled with', undefined);
          });

          describe('when a "require" export is present', function () {
            const fixture = normalize(
              `${__dirname}/fixture/no-missing-exports-require`,
            );

            describe('when the file is ESM', function () {
              it('should return a failure', async function () {
                await expect(
                  runRule(fixture),
                  'to be fulfilled with value satisfying',
                  [
                    {
                      rule: name,
                      message:
                        /require. to be a CJS script at path: \.\/index\.js$/,
                    },
                  ],
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
                  runRule(fixture),
                  'to be fulfilled with value satisfying',
                  [
                    {
                      rule: name,
                      message:
                        /import. to be an ESM module at path: \.\/index\.js$/,
                    },
                  ],
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
                  runRule(fixture),
                  'to be fulfilled with value satisfying',
                  [
                    {
                      rule: name,
                      message:
                        /types. to be a \.d\.ts file at path: \.\/index\.js$/,
                    },
                  ],
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
                  runRule(fixture),
                  'to be fulfilled with value satisfying',
                  [
                    {
                      rule: name,
                      message: /must be the last export$/,
                    },
                  ],
                );
              });
            });

            describe('when it appears last in the "exports" object', function () {
              const fixture = normalize(
                `${__dirname}/fixture/no-missing-exports-default-ok`,
              );
              it('should not return a failure', async function () {
                await expect(
                  runRule(fixture),
                  'to be fulfilled with',
                  undefined,
                );
              });
            });

            describe('when the "order" option is disabled', function () {
              const fixture = normalize(
                `${__dirname}/fixture/no-missing-exports-default`,
              );

              it('should not return a failure', async function () {
                await expect(
                  runRule(fixture, {order: false}),
                  'to be fulfilled with',
                  undefined,
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
              expect.it('to be an array'),
            );
          });
        });
      });
    });
  });
});
