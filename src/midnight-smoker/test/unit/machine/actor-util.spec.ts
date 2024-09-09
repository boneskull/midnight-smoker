import {ERROR, OK} from '#constants';
import {AssertionError} from '#error/assertion-error';
import {
  assertActorOutputNotOk,
  assertActorOutputOk,
  monkeypatchActorLogger,
} from '#machine/util';
import {isActorOutputNotOk, isActorOutputOk} from '#util/guard/actor-output';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('machine', function () {
    describe('actor-util', function () {
      describe('assertActorOutputNotOk()', function () {
        it('should throw an error if output is ok', function () {
          const output = {id: 'test', type: OK} as any;
          expect(
            () => {
              assertActorOutputNotOk(output);
            },
            'to throw an',
            AssertionError,
          );
        });

        it('should not throw an error if output is not ok', function () {
          const output = {
            error: new Error('test error'),
            id: 'test',
            type: ERROR,
          } as any;
          expect(() => {
            assertActorOutputNotOk(output);
          }, 'not to throw');
        });
      });

      describe('assertActorOutputOk()', function () {
        it('should throw an error if output is not ok', function () {
          const output = {
            error: new Error('test error'),
            id: 'test',
            type: ERROR,
          } as any;
          expect(
            () => {
              assertActorOutputOk(output);
            },
            'to throw an',
            AssertionError,
          );
        });

        it('should not throw an error if output is ok', function () {
          const output = {id: 'test', type: OK} as any;
          expect(() => {
            assertActorOutputOk(output);
          }, 'not to throw');
        });
      });

      // TODO: move these two to a separate file
      describe('isActorOutputNotOk()', function () {
        it('should return true if output is not ok', function () {
          const output = {
            error: new Error('test error'),
            id: 'test',
            type: ERROR,
          } as any;
          expect(isActorOutputNotOk(output), 'to be true');
        });

        it('should return false if output is ok', function () {
          const output = {id: 'test', type: OK} as any;
          expect(isActorOutputNotOk(output), 'to be false');
        });
      });

      describe('isActorOutputOk()', function () {
        it('should return true if output is ok', function () {
          const output = {id: 'test', type: OK} as any;
          expect(isActorOutputOk(output), 'to be true');
        });

        it('should return false if output is not ok', function () {
          const output = {
            error: new Error('test error'),
            id: 'test',
            type: ERROR,
          } as any;
          expect(isActorOutputOk(output), 'to be false');
        });
      });

      describe('monkeypatchActorLogger()', function () {
        it('should set the logger of the actor', function () {
          const actor = {_actorScope: {logger: null}, logger: null} as any;
          const namespace = 'test';
          expect(monkeypatchActorLogger(actor, namespace), 'to satisfy', {
            _actorScope: {logger: expect.it('to be a function')},
            logger: expect.it('to be a function'),
          });
        });
      });
    });
  });
});
