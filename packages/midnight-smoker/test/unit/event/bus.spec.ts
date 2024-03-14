import {EventBus} from '#event/bus';
import asyncMitt, {type Emitter} from 'async-mitt';
import {createSandbox, type SinonSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('event', function () {
    describe('bus', function () {
      let sandbox: SinonSandbox;

      beforeEach(function () {
        sandbox = createSandbox();
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('EventBus', function () {
        type SyncEvents = {
          foo: {data: string};
        };

        type AsyncEvents = {
          bar: {data: string};
        };

        let eventBus: EventBus<SyncEvents, AsyncEvents>;
        let emitter: Emitter<SyncEvents, AsyncEvents>;

        beforeEach(function () {
          emitter = asyncMitt<SyncEvents, AsyncEvents>();
          eventBus = EventBus.create(emitter);
        });

        it('create() should return a new EventBus instance', function () {
          const bus = EventBus.create(emitter);
          expect(bus, 'to be a', EventBus);
        });

        it('context() should return an EventContext instance', function () {
          const context = eventBus.context();
          expect(context, 'to be defined');
        });

        it('emit() should call emitter.emitAsync', async function () {
          const mockEmitAsync = sandbox.spy(emitter, 'emitAsync');
          await eventBus.emit('bar', {data: 'testData'});
          expect(mockEmitAsync, 'to have a call satisfying', [
            'bar',
            {
              data: 'testData',
            },
          ]);
        });

        it('emitSync() should call emitter.emit', function () {
          const mockEmit = sandbox.spy(emitter, 'emit');
          eventBus.emitSync('foo', {data: 'testData'});
          expect(mockEmit, 'to have a call satisfying', [
            'foo',
            {data: 'testData'},
          ]);
        });
      });
    });
  });
});
