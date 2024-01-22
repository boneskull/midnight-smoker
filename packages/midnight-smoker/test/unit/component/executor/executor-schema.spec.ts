import rewiremock from 'rewiremock/node';
import unexpected from 'unexpected';
import type * as E from '../../../../src/component/executor';
import {createFsMocks} from '../../mocks/fs';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('executor', function () {
      describe('schema', function () {
        let ExecError: typeof E.ExecError;
        let zExecError: typeof E.zExecError;
        let zExecResult: typeof E.zExecResult;

        beforeEach(function () {
          const {mocks} = createFsMocks();
          ({ExecError, zExecError, zExecResult} = rewiremock.proxy(
            () => require('../../../../src/component/executor'),
            mocks,
          ));
        });
        describe('ExecError schema', function () {
          describe('when provided invalid data', function () {
            it('should throw', function () {
              expect(() => zExecError.parse({}), 'to throw');
            });
          });

          describe('when provided valid data', function () {
            it('should not throw', function () {
              expect(
                () =>
                  zExecError.parse(
                    new ExecError(
                      Object.assign(new Error('foo'), {
                        exitCode: 1,
                        all: '',
                        stdout: 'foo',
                        isCanceled: false,
                        shortMessage: '',
                        escapedCommand: '',
                        timedOut: false,
                        killed: false,
                        stderr: 'bar',
                        command: '',
                        failed: false,
                      }),
                    ),
                  ),
                'not to throw',
              );
            });
          });
        });

        describe('ExecResult schema', function () {
          describe('when provided invalid data', function () {
            it('should throw', function () {
              expect(() => zExecResult.parse({}), 'to throw');
            });
          });

          describe('when provided valid data', function () {
            it('should not throw', function () {
              expect(
                () =>
                  zExecResult.parse({
                    all: '',
                    stdout: 'foo',
                    stderr: 'bar',
                    command: '',
                    exitCode: 1,
                    failed: false,
                  }),
                'not to throw',
              );
            });
          });
        });
      });
    });
  });
});
