import {RuleSeverities} from '#constants';
import {type SomeRule} from '#defs/rule';
import {OptionsParser} from '#options/options-parser';
import {PluginRegistry} from '#plugin/registry';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import {z} from 'zod';
import {isValidationError} from 'zod-validation-error';

const expect = unexpected.clone();

const DEFAULT_TEST_PLUGIN_NAME = 'test-plugin';
const DEFAULT_TEST_RULE_NAME = 'test-rule';
const RULE_ID = `${DEFAULT_TEST_PLUGIN_NAME}/${DEFAULT_TEST_RULE_NAME}`;

describe('midnight-smoker', function () {
  describe('OptionsParser', function () {
    describe('method', function () {
      let sandbox: sinon.SinonSandbox;
      let parser: OptionsParser;

      beforeEach(function () {
        sandbox = createSandbox();
        parser = OptionsParser.create(PluginRegistry.create());
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
            let registry: PluginRegistry;
            let parser: OptionsParser;

            before(async function () {
              registry = PluginRegistry.create();
              await registry.registerPlugin('test-plugin', {
                plugin: ({defineRule}) => {
                  defineRule({
                    check: () => {},
                    description: 'desc',
                    name: DEFAULT_TEST_RULE_NAME,
                  });
                },
              });
              parser = OptionsParser.create(registry);
            });

            after(function () {
              registry.clear();
            });

            it('should never parse rule-specific options as undefined', function () {
              expect(parser.parse(), 'to satisfy', {
                rules: expect.it('to equal', {
                  [RULE_ID]: {
                    opts: {},
                    severity: 'error',
                  },
                }),
              });
            });
          });

          describe('"rules" property', function () {
            let registry: PluginRegistry;
            let parser: OptionsParser;
            let rule: SomeRule;

            before(async function () {
              registry = PluginRegistry.create();
              const plugin = await registry.registerPlugin('test-plugin', {
                plugin: ({defineRule}) => {
                  defineRule({
                    check: () => {},
                    defaultSeverity: RuleSeverities.Error,
                    description: 'desc',
                    name: DEFAULT_TEST_RULE_NAME,
                    schema: z.object({
                      foo: z.string().default('bar'),
                    }),
                  });
                },
              });
              rule = plugin.rules[0]!;

              parser = OptionsParser.create(registry);
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
                      opts: {
                        foo: 'baz',
                      },
                      severity: 'error',
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
                      opts: {foo: 'bar'},
                      severity: rule.defaultSeverity,
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
                      opts: {
                        foo: 'baz',
                      },
                      severity: 'warn',
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
