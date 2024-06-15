import {ERROR, OK} from '#constants';
import {
  assertActorOutputNotOk,
  assertActorOutputOk,
  idFromEventType,
  isActorOutputNotOk,
  isActorOutputOk,
  monkeypatchActorLogger,
} from '#machine/util';
import {AssertionError} from 'node:assert';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('machine', function () {
    describe('actor-util', function () {
      describe('assertActorOutputNotOk()', function () {
        it('should throw an error if output is ok', function () {
          const output = {type: OK, id: 'test'} as any;
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
            type: ERROR,
            id: 'test',
            error: new Error('test error'),
          } as any;
          expect(() => {
            assertActorOutputNotOk(output);
          }, 'not to throw');
        });
      });

      describe('assertActorOutputOk()', function () {
        it('should throw an error if output is not ok', function () {
          const output = {
            type: ERROR,
            id: 'test',
            error: new Error('test error'),
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
          const output = {type: OK, id: 'test'} as any;
          expect(() => {
            assertActorOutputOk(output);
          }, 'not to throw');
        });
      });

      describe('isActorOutputNotOk()', function () {
        it('should return true if output is not ok', function () {
          const output = {
            type: ERROR,
            id: 'test',
            error: new Error('test error'),
          } as any;
          expect(isActorOutputNotOk(output), 'to be true');
        });

        it('should return false if output is ok', function () {
          const output = {type: OK, id: 'test'} as any;
          expect(isActorOutputNotOk(output), 'to be false');
        });
      });

      describe('isActorOutputOk()', function () {
        it('should return true if output is ok', function () {
          const output = {type: OK, id: 'test'} as any;
          expect(isActorOutputOk(output), 'to be true');
        });

        it('should return false if output is not ok', function () {
          const output = {
            type: ERROR,
            id: 'test',
            error: new Error('test error'),
          } as any;
          expect(isActorOutputOk(output), 'to be false');
        });
      });

      describe('monkeypatchActorLogger()', function () {
        it('should set the logger of the actor', function () {
          const actor = {logger: null, _actorScope: {logger: null}} as any;
          const namespace = 'test';
          expect(monkeypatchActorLogger(actor, namespace), 'to satisfy', {
            logger: expect.it('to be a function'),
            _actorScope: {logger: expect.it('to be a function')},
          });
        });
      });

      describe('idFromEventType()', function () {
        describe('when the event type is as expected', function () {
          it('should return the actor ID', function () {
            const event = {type: 'xstate.done.actor.test'} as const;
            expect(idFromEventType(event), 'to equal', 'test');
          });
        });

        describe('when the event type is not as expected', function () {
          it('should return undefined', function () {
            const event = {type: 'xstate.actor.test'} as const;
            // @ts-expect-error bad type
            expect(idFromEventType(event), 'to be undefined');
          });
        });
      });
    });
  });
});
