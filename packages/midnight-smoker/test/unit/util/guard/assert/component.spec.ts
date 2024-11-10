import {asValidationError} from '#error/validation-error';
import {ExecutorSchema} from '#schema/executor';
import {PkgManagerSchema} from '#schema/pkg-manager';
import {ReporterSchema} from '#schema/reporter';
import {RuleSchema} from '#schema/rule';
import {
  assertExecutor,
  assertPkgManager,
  assertReporter,
  assertRule,
} from '#util/guard/assert/component';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('guard', function () {
      describe('assert', function () {
        describe('component', function () {
          let sandbox: sinon.SinonSandbox;

          beforeEach(function () {
            sandbox = sinon.createSandbox();
          });

          afterEach(function () {
            sandbox.restore();
          });

          describe('assertRule()', function () {
            it('should not throw an error for a valid rule', function () {
              const validRule = {
                /* valid rule object */
              };
              sandbox
                .stub(RuleSchema, 'safeParse')
                .returns({success: true} as any);

              expect(() => {
                assertRule(validRule);
              }, 'not to throw');
            });

            it('should throw a validation error for an invalid rule', function () {
              const invalidRule = {
                /* invalid rule object */
              };
              const error = new Error('Invalid rule');
              sandbox
                .stub(RuleSchema, 'safeParse')
                .returns({error, success: false} as any);

              expect(
                () => {
                  assertRule(invalidRule);
                },
                'to throw',
                asValidationError(error),
              );
            });
          });

          describe('assertPkgManager()', function () {
            it('should not throw an error for a valid package manager', function () {
              const validPkgManager = {
                /* valid package manager object */
              };
              sandbox
                .stub(PkgManagerSchema, 'safeParse')
                .returns({success: true} as any);

              expect(() => {
                assertPkgManager(validPkgManager);
              }, 'not to throw');
            });

            it('should throw a validation error for an invalid package manager', function () {
              const invalidPkgManager = {
                /* invalid package manager object */
              };
              const error = new Error('Invalid package manager');
              sandbox
                .stub(PkgManagerSchema, 'safeParse')
                .returns({error, success: false} as any);

              expect(
                () => {
                  assertPkgManager(invalidPkgManager);
                },
                'to throw',
                asValidationError(error),
              );
            });
          });

          describe('assertReporter()', function () {
            it('should not throw an error for a valid reporter', function () {
              const validReporter = {
                /* valid reporter object */
              };
              sandbox
                .stub(ReporterSchema, 'safeParse')
                .returns({success: true} as any);

              expect(() => {
                assertReporter(validReporter);
              }, 'not to throw');
            });

            it('should throw a validation error for an invalid reporter', function () {
              const invalidReporter = {
                /* invalid reporter object */
              };
              const error = new Error('Invalid reporter');
              sandbox
                .stub(ReporterSchema, 'safeParse')
                .returns({error, success: false} as any);

              expect(
                () => {
                  assertReporter(invalidReporter);
                },
                'to throw',
                asValidationError(error),
              );
            });
          });

          describe('assertExecutor()', function () {
            it('should not throw an error for a valid executor', function () {
              const validExecutor = {
                /* valid executor object */
              };
              sandbox
                .stub(ExecutorSchema, 'safeParse')
                .returns({success: true} as any);

              expect(() => {
                assertExecutor(validExecutor);
              }, 'not to throw');
            });

            it('should throw a validation error for an invalid executor', function () {
              const invalidExecutor = {
                /* invalid executor object */
              };
              const error = new Error('Invalid executor');
              sandbox
                .stub(ExecutorSchema, 'safeParse')
                .returns({error, success: false} as any);

              expect(
                () => {
                  assertExecutor(invalidExecutor);
                },
                'to throw',
                asValidationError(error),
              );
            });
          });
        });
      });
    });
  });
});
