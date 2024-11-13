import {monkeypatchActorLogger} from '#machine/util';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('machine', function () {
    describe('actor-util', function () {
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
