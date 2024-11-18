import {ExecError} from 'midnight-smoker';
import unexpected from 'unexpected';

import {isExecError} from '../../../src/package-manager/util';

const expect = unexpected.clone();

describe('@midnight-smoker/plugin-default', function () {
  describe('package-manager', function () {
    describe('util', function () {
      describe('isExecError()', function () {
        describe('when value is an ExecError', function () {
          it('should return true', function () {
            const execErrorInstance = new ExecError('Test error', {} as any);
            expect(isExecError(execErrorInstance), 'to be true');
          });
        });

        describe('when value is not an ExecError', function () {
          it('should return false', function () {
            const nonExecErrorInstance = new Error('Test error');
            expect(isExecError(nonExecErrorInstance), 'to be false');
          });
        });
      });
    });
  });
});
