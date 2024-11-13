import {SmokerReferenceError} from '#error/smoker-reference-error';
import unexpected from 'unexpected';
const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('error', function () {
    describe('smoker-reference-error', function () {
      describe('SmokerReferenceError', function () {
        let error: SmokerReferenceError<{detail: string}>;

        describe('property', function () {
          it('should have the shouldAskForBugReport property set to true', function () {
            error = new SmokerReferenceError('Test message', {
              detail: 'some detail',
            });
            expect(error.shouldAskForBugReport, 'to be true');
          });
        });
      });
    });
  });
});
