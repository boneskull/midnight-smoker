import {RuleSeverities} from '#constants';
import type * as PR from '#plugin/plugin-registry';
import type {SomeRule} from '#schema/rule';
import {
  DEFAULT_TEST_PLUGIN_NAME,
  DEFAULT_TEST_RULE_NAME,
} from '@midnight-smoker/test-util/constants';
import {registerRule} from '@midnight-smoker/test-util/register';
import {memoize} from 'lodash';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import {z} from 'zod';
import {isValidationError} from 'zod-validation-error';
import type * as OP from '../../src/options/parser';
import {createFsMocks} from './mocks/fs';

const expect = unexpected.clone();

const RULE_ID = `${DEFAULT_TEST_PLUGIN_NAME}/${DEFAULT_TEST_RULE_NAME}`;

describe('midnight-smoker', function () {
  describe('OptionParser', function () {
    describe('method', function () {
      let parser: OP.OptionParser;
      let OptionParser: typeof OP.OptionParser;
      let PluginRegistry: typeof PR.PluginRegistry;
      let sandbox: sinon.SinonSandbox;

      beforeEach(function () {
        sandbox = createSandbox();
        const {fs, mocks} = createFsMocks();

        const PMM = rewiremock.proxy(
          () => require('../../src/plugin/plugin-metadata'),
          mocks,
        );
        const Registry = rewiremock.proxy(
          () => require('../../src/plugin/plugin-registry'),
          {
            ...mocks,
            '../../src/util/loader-util': {
              /**
               * This thing loads and evals files via the in-memory filesystem.
               *
               * For this to do _anything_, you have to call
               * `fs.promises.writeFile(...)` first.
               */
              justImport: sandbox.stub().callsFake(
                memoize(async (moduleId: string) => {
                  const source = await fs.promises.readFile(moduleId, 'utf8');
                  // eslint-disable-next-line no-eval
                  return eval(`${source}`);
                }),
              ),
            },
            // this is horrid, but otherwise the PluginRegistry won't have the same
            // PluginMetadata class as we use here in the test file
            '../../src/plugin/plugin-metadata': PMM,
          },
        );

        ({OptionParser} = rewiremock.proxy(
          () => require('../../src/options/parser'),
          {
            ...mocks,
            '../../src/plugin/plugin-registry': Registry,
          },
        ));

        ({PluginRegistry} = Registry);

        parser = OptionParser.create(PluginRegistry.create());
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('parse()', function () {
        describe('when provided no options', function () {
          it('should not throw', function () {
            expect(() => parser.parse(), 'not to throw');
          });

          it('should never return undefined', function () {
            expect(parser.parse(), 'to be an', 'object');
          });

          it('should never have an undefined "rules" property', function () {
            expect(parser.parse(), 'to satisfy', {rules: {}});
          });
        });

        describe('when provided unknown options', function () {
          it('should not throw', function () {
            // @ts-expect-error bad type
            expect(() => parser.parse({cows: true}), 'not to throw');
          });
        });

        describe('when provided invalid options', function () {
          it('should throw', function () {
            expect(
              () => parser.parse({all: true, workspace: ['foo']}),
              'to throw',
              /Option "workspace" is mutually exclusive with "all"/,
            );
          });
        });

        describe('when called before plugin registration', function () {
          describe('when rule-specific options are provided', function () {
            it('should apply defaults and pass through', function () {
              expect(
                parser.parse({
                  rules: {[RULE_ID]: {cows: 'moo'}},
                }),
                'to satisfy',
                {
                  rules: {
                    [RULE_ID]: expect.it('to equal', {
                      opts: {cows: 'moo'},
                      severity: RuleSeverities.Error,
                    }),
                  },
                },
              );
            });
          });
        });

        describe('when called after plugin registration', function () {
          describe('when rules provide no options', function () {
            let registry: PR.PluginRegistry;
            let parser: OP.OptionParser;

            before(async function () {
              registry = PluginRegistry.create();
              sandbox.stub(registry, 'getBlessedMetadata').resolves();

              await registerRule(registry, {name: DEFAULT_TEST_RULE_NAME});
              parser = OptionParser.create(registry);
            });

            after(function () {
              registry.clear();
            });

            it('should never parse rule-specific options as undefined', function () {
              expect(parser.parse(), 'to satisfy', {
                rules: expect.it('to equal', {
                  [RULE_ID]: {
                    severity: 'error',
                    opts: {},
                  },
                }),
              });
            });
          });

          describe('"rules" property', function () {
            let registry: PR.PluginRegistry;
            let parser: OP.OptionParser;
            let rule: SomeRule;

            before(async function () {
              registry = PluginRegistry.create();
              sandbox.stub(registry, 'getBlessedMetadata').resolves();
              rule = await registerRule(
                registry,
                {
                  name: DEFAULT_TEST_RULE_NAME,
                  schema: z.object({
                    foo: z.string().default('bar'),
                  }),
                },
                DEFAULT_TEST_PLUGIN_NAME,
              );
              parser = OptionParser.create(registry);
            });

            after(function () {
              registry.clear();
            });

            it('should allow undefined', function () {
              expect(() => parser.parse({rules: undefined}), 'not to throw');
            });

            it('should allow an empty object', function () {
              expect(() => parser.parse({rules: {}}), 'not to throw');
            });

            it('should allow user-provided rule-specific severity', function () {
              expect(parser.parse({rules: {[RULE_ID]: 'warn'}}), 'to satisfy', {
                rules: {
                  [`${DEFAULT_TEST_PLUGIN_NAME}/${DEFAULT_TEST_RULE_NAME}`]: {
                    severity: 'warn',
                  },
                },
              });
            });

            it('should disallow invalid user-provided rule-specific severity', async function () {
              expect(
                () =>
                  parser.parse({
                    // @ts-expect-error bad types
                    rules: {[RULE_ID]: 'sylvester'},
                  }),
                'to error',
              ).and((err: Error) => isValidationError(err), 'to be true');
            });

            it('should allow valid user-provided rule-specific options', function () {
              expect(
                parser.parse({rules: {[RULE_ID]: {foo: 'bar'}}}),
                'to satisfy',
                {
                  rules: {
                    [RULE_ID]: {
                      opts: {
                        foo: 'bar',
                      },
                    },
                  },
                },
              );
            });

            it('should disallow invalid user-provided rule-specific options', async function () {
              expect(
                () =>
                  parser.parse({
                    rules: {[RULE_ID]: {foo: 3}},
                  }),
                'to error',
              ).and((err: Error) => isValidationError(err), 'to be true');
            });

            it('should allow valid normalized user-provided rule-specific options', function () {
              expect(
                parser.parse({
                  rules: {
                    [RULE_ID]: {
                      opts: {foo: 'baz'},
                      severity: RuleSeverities.Error,
                    },
                  },
                }),
                'to satisfy',
                {
                  rules: {
                    [RULE_ID]: expect.it('to equal', {
                      severity: 'error',
                      opts: {
                        foo: 'baz',
                      },
                    }),
                  },
                },
              );
            });

            it('should apply defaults', function () {
              expect(
                parser.parse({
                  rules: {
                    [RULE_ID]: {},
                  },
                }),
                'to satisfy',
                {
                  rules: {
                    [RULE_ID]: expect.it('to equal', {
                      severity: rule.defaultSeverity,
                      opts: {foo: 'bar'},
                    }),
                  },
                },
              );
            });

            it('should allow user-provided rule-specific options and severity', function () {
              expect(
                parser.parse({
                  rules: {[RULE_ID]: ['warn', {foo: 'baz'}]},
                }),
                'to satisfy',
                {
                  rules: {
                    [RULE_ID]: {
                      severity: 'warn',
                      opts: {
                        foo: 'baz',
                      },
                    },
                  },
                },
              );
            });
          });
        });
      });
    });
  });
});
