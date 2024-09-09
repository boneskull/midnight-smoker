import {AbortError} from '#error/abort-error';
import {AggregateSmokerError} from '#error/aggregate-smoker-error';
import {BaseSmokerError} from '#error/base-error';
import {type SomeSmokerError} from '#error/some-smoker-error';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('error', function () {
    describe('AggregateSmokerError', function () {
      let sandbox: sinon.SinonSandbox;
      let baseStub: sinon.SinonStubbedInstance<BaseSmokerError>;

      /**
       * `AggregateSmokerError` is abstract and cannot be tested directly, so
       * here's this.
       *
       * @remarks
       * Objects created using this class **will fail** the
       * `isSomeSmokerError()` guard, because the class has no entry in
       * `ErrorCodes`.
       */
      class DummyAggregateSmokerError extends AggregateSmokerError {
        // @ts-expect-error not an actual err code
        override code = 'ESMOKER_AGGREGATE_DUMMY';

        name = 'DummyAggregateSmokerError' as any;
      }

      /**
       * A dummy implementation of a {@link SmokerError}.
       *
       * @remarks
       * Objects created using this class **will fail** the
       * `isSomeSmokerError()` guard, because the class has no entry in
       * `ErrorCodes`.
       */
      class DummySmokerError extends BaseSmokerError<void, unknown> {
        name = 'DummySmokerError' as any;

        constructor(message: string, cause?: unknown) {
          super(message, undefined, cause);
          Object.defineProperty(this, 'code', {value: 'ESMOKER_DUMMY'});
        }
      }

      beforeEach(function () {
        sandbox = sinon.createSandbox();
        // Stub all calls to BaseSmokerError
        baseStub = sandbox.stub(BaseSmokerError.prototype);
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('constructor', function () {
        it('should instantiate an AggregateError', function () {
          const errors = [
            new DummySmokerError('Error 1'),
            new DummySmokerError('Error 2'),
          ];
          const aggregateError = new DummyAggregateSmokerError('test', errors);

          expect(aggregateError, 'to be an', AggregateError);
        });

        describe('when provided two or more values for the "errors" argument', function () {
          it('should set the "errors" property to an array of the provided values', function () {
            const errors = [
              new DummySmokerError('Error 1'),
              new DummySmokerError('Error 2'),
            ];
            expect(
              new DummyAggregateSmokerError('test', errors).errors,
              'to equal',
              errors,
            );
          });

          it('should never set a "cause" property', function () {
            const errors = [
              new DummySmokerError('Error 1'),
              new DummySmokerError('Error 2'),
            ];
            expect(
              new DummyAggregateSmokerError('test', errors).cause,
              'to be undefined',
            );
          });
        });

        describe('when provided a single value for the "errors" argument', function () {
          let dummyError: DummySmokerError;
          let aggregateError: DummyAggregateSmokerError;

          beforeEach(function () {
            dummyError = new DummySmokerError('Error 1');
            aggregateError = new DummyAggregateSmokerError('test', dummyError);
          });

          it('should set the "cause" property to the error', function () {
            expect(aggregateError.cause, 'to be', dummyError);
          });

          it('should set the "errors" property to a single-element array', function () {
            expect(aggregateError.errors, 'to equal', [dummyError]);
          });
        });
      });

      describe('method', function () {
        describe('toJSON()', function () {
          it('should include errors', function () {
            const err = new DummyAggregateSmokerError('test', [
              new DummySmokerError('Error 1'),
              new DummySmokerError('Error 2'),
            ]);
            expect(err.toJSON(), 'to satisfy', {
              errors: expect.it('to be an array').and('to have length', 2),
            });
          });
        });

        describe('formatMessage()', function () {
          it('should delegate to BaseSmokerError.prototype.formatMessage()', function () {
            const err = new DummyAggregateSmokerError(
              'test',
              new DummySmokerError('Error 1'),
            );
            err.formatMessage(true);
            expect(
              BaseSmokerError.prototype.formatMessage,
              'was called once',
            ).and('to have a call satisfying', [true]);
          });
        });

        describe('formatCode()', function () {
          it('should delegate to BaseSmokerError.prototype.formatCode()', function () {
            const err = new DummyAggregateSmokerError(
              'test',
              new DummySmokerError('Error 1'),
            );
            err.formatCode();
            expect(BaseSmokerError.prototype.formatCode, 'was called once');
          });
        });

        describe('format()', function () {
          beforeEach(function () {
            baseStub.format.callsFake(function (
              this: SomeSmokerError,
              verbose = false,
            ) {
              return verbose ? `${this.name} verbose` : this.name;
            });
          });

          describe('when aggregating non-SmokerError errors', function () {
            describe('when called without the "verbose" flag', function () {
              it('should format itself and all errors in the "errors" property', function () {
                const errors = [
                  new DummySmokerError('Error 1'),
                  new DummySmokerError('Error 2'),
                ];
                const aggregateError = new DummyAggregateSmokerError(
                  'test',
                  errors,
                );
                expect(
                  aggregateError.format(),
                  'to be',
                  'DummyAggregateSmokerError\n\n  DummySmokerError\n\n  DummySmokerError',
                );
              });
            });

            describe('when called with the "verbose" flag', function () {
              it('should format itself and all errors in the "errors" property (verbosely)', function () {
                const errors = [
                  new DummySmokerError('Error 1'),
                  new DummySmokerError('Error 2'),
                ];
                const aggregateError = new DummyAggregateSmokerError(
                  'test',
                  errors,
                );
                expect(
                  aggregateError.format(true),
                  'to be',
                  'DummyAggregateSmokerError verbose\n\n  DummySmokerError verbose\n\n  DummySmokerError verbose',
                );
              });
            });

            describe('when instantiated with a single error', function () {
              it('should not format the "errors" property', function () {
                // the formatted result should be the same as from
                // BaseSmokerError.prototype.format()
                const error = new DummySmokerError('Error 1');
                expect(
                  new DummyAggregateSmokerError('test', error).format(),
                  'to be',
                  'DummyAggregateSmokerError',
                );
              });
            });
          });

          describe('when aggregating SmokerError errors', function () {
            let errors: SomeSmokerError[];

            beforeEach(function () {
              errors = [
                new AbortError('Error 1'),
                new AbortError('Error 1'),
              ].map((err) =>
                Object.assign(err, {
                  format: sandbox.stub().callsFake(function (verbose = false) {
                    if (verbose) {
                      return 'abort!!!';
                    }
                    return 'abort!';
                  }),
                }),
              );
            });

            describe('when called without the "verbose" flag', function () {
              it('should format itself and all errors in the "errors" property', function () {
                const aggregateError = new DummyAggregateSmokerError(
                  'test',
                  errors,
                );
                expect(
                  aggregateError.format(),
                  'to be',
                  'DummyAggregateSmokerError\n\n  abort!\n\n  abort!',
                );
              });
            });

            describe('when called with the "verbose" flag', function () {
              it('should format itself and all errors in the "errors" property (verbosely)', function () {
                const aggregateError = new DummyAggregateSmokerError(
                  'test',
                  errors,
                );
                expect(
                  aggregateError.format(true),
                  'to be',
                  'DummyAggregateSmokerError verbose\n\n  abort!!!\n\n  abort!!!',
                );
              });
            });
          });
        });

        describe('formatCause()', function () {
          it('should delegate to BaseSmokerError.prototype.formatCause()', function () {
            const err = new DummyAggregateSmokerError(
              'test',
              new DummySmokerError('Error 1'),
            );
            err.formatCause();
            expect(BaseSmokerError.prototype.formatCause, 'was called once');
          });
        });
      });
    });
  });
});
