import {registerRule} from '@midnight-smoker/test-util';
import unexpected from 'unexpected';
import {z} from 'zod';
import {isValidationError} from 'zod-validation-error';
import type {Rule} from '../../src/component';
import {RuleSeverities} from '../../src/component';
import {OptionParser} from '../../src/options';
import {BLESSED_PLUGINS} from '../../src/plugin/blessed';
import {PluginRegistry} from '../../src/plugin/registry';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('OptionParser', function () {
    describe('method', function () {
      let parser: OptionParser;

      beforeEach(function () {
        parser = OptionParser.create(PluginRegistry.create());
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
                parser.parse({rules: {'test-rule': {cows: 'moo'}}}),
                'to satisfy',
                {
                  rules: {
                    'test-rule': expect.it('to equal', {
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
            let parser: OptionParser;

            before(async function () {
              registry = PluginRegistry.create();
              await registerRule(
                {
                  name: 'test-rule',
                },
                registry,
                '@midnight-smoker/plugin-default',
              );
              parser = OptionParser.create(registry);
            });

            after(function () {
              registry.clear();
            });

            it('should never parse rule-specific options as undefined', function () {
              expect(parser.parse(), 'to satisfy', {
                rules: expect.it('to equal', {
                  'test-rule': {severity: 'error', opts: {}},
                }),
              });
            });
          });

          describe('"rules" property', function () {
            let registry: PluginRegistry;
            let parser: OptionParser;
            let rule: Rule<string, any>;

            before(async function () {
              registry = PluginRegistry.create();
              rule = await registerRule(
                {
                  name: 'test-rule',
                  schema: z.object({
                    foo: z.string().default('bar'),
                  }),
                },
                registry,
                BLESSED_PLUGINS[0],
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
              expect(
                parser.parse({rules: {'test-rule': 'warn'}}),
                'to satisfy',
                {
                  rules: {
                    'test-rule': {
                      severity: 'warn',
                    },
                  },
                },
              );
            });

            it('should disallow invalid user-provided rule-specific severity', async function () {
              expect(
                // @ts-expect-error bad types
                () => parser.parse({rules: {'test-rule': 'sylvester'}}),
                'to error',
              ).and((err: Error) => isValidationError(err), 'to be true');
            });

            it('should allow valid user-provided rule-specific options', function () {
              expect(
                parser.parse({rules: {'test-rule': {foo: 'bar'}}}),
                'to satisfy',
                {
                  rules: {
                    'test-rule': {
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
                    rules: {'test-rule': {foo: 3}},
                  }),
                'to error',
              ).and((err: Error) => isValidationError(err), 'to be true');
            });

            it('should allow valid normalized user-provided rule-specific options', function () {
              expect(
                parser.parse({
                  rules: {
                    'test-rule': {
                      opts: {foo: 'baz'},
                      severity: RuleSeverities.Error,
                    },
                  },
                }),
                'to satisfy',
                {
                  rules: {
                    'test-rule': expect.it('to equal', {
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
                    'test-rule': {},
                  },
                }),
                'to satisfy',
                {
                  rules: {
                    'test-rule': expect.it('to equal', {
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
                  rules: {'test-rule': ['warn', {foo: 'baz'}]},
                }),
                'to satisfy',
                {
                  rules: {
                    'test-rule': {
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
