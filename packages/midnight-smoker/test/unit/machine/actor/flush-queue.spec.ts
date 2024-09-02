import {CoreEvents} from '#constants';
import {ErrorCode} from '#error/codes';
import {type SomeDataForEvent} from '#event/events';
import {flushQueueLogic} from '#machine/actor/flush-queue';
import {type OmitSignal} from '#machine/util/index';
import {type StaticPluginMetadata} from '#plugin/static-plugin-metadata';
import {type ReporterContext} from '#reporter/reporter-context';
import {type Reporter} from '#schema/reporter';
import {type SmokerOptions} from '#schema/smoker-options';
import {EventEmitter} from 'node:events';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {type Actor, createActor} from 'xstate';
import {runUntilDone} from 'xstate-audition';

import {nullReporter} from '../../mocks';
const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('actor', function () {
    describe('flushQueueLogic()', function () {
      let actor: Actor<typeof flushQueueLogic>;
      let sandbox: sinon.SinonSandbox;
      let reporter: Reporter;
      let ctx: OmitSignal<ReporterContext>;
      let queue: SomeDataForEvent[];

      beforeEach(function () {
        sandbox = createSandbox();
        reporter = {...nullReporter};
        queue = [{type: CoreEvents.Noop} as const];
        ctx = {
          opts: {} as SmokerOptions,
          pkgJson: {name: 'foo', version: '1.0.0'},
          plugin: {} as StaticPluginMetadata,
        };
        actor = createActor(flushQueueLogic, {input: {ctx, queue, reporter}});
      });

      afterEach(function () {
        sandbox.restore();
      });

      it('should flush the event queue', async function () {
        await runUntilDone(actor);

        expect(queue, 'to be empty');
      });

      describe('when provided an empty queue', function () {
        it('should not process the queue', async function () {
          queue = [];
          sandbox.stub(queue, 'shift');
          await runUntilDone(actor);
          expect(queue.shift, 'was not called');
        });
      });

      it('should invoke the appropriate ReporterListener(s)', async function () {
        const listener = sandbox.stub();
        reporter.onNoop = listener;
        await runUntilDone(actor);

        expect(listener, 'was called once').and('to have a call satisfying', [
          ctx,
          {type: CoreEvents.Noop},
        ]);
      });

      describe('when a ReporterListener errors', function () {
        it('should throw a ReporterError', async function () {
          const err = new Error('snimm');
          const listener = sandbox.stub().throws(err);
          reporter.onNoop = listener;

          await expect(
            runUntilDone(actor),
            'to be rejected with error satisfying',
            {
              cause: err,
              code: ErrorCode.ReporterError,
            },
          );
        });
      });

      describe('when provided an `auxEmitter`', function () {
        let auxEmitter: EventEmitter;

        beforeEach(function () {
          auxEmitter = new EventEmitter();
        });

        afterEach(function () {
          auxEmitter.removeAllListeners();
        });

        it('should emit events from the `auxEmitter`', async function () {
          const listener = sandbox.stub();
          auxEmitter.once(CoreEvents.Noop, listener);
          const actor = createActor(flushQueueLogic, {
            input: {auxEmitter, ctx, queue, reporter},
          });
          await runUntilDone(actor);

          expect(listener, 'was called once');
        });

        describe('when the listener throws', function () {
          it('should emit "error" on the `auxEmitter`', async function () {
            const err = new Error('sylvester mcmonkey mcbean');
            const noopListener = sandbox.stub().throws(err);
            const errListener = sandbox.stub();
            auxEmitter
              .once(CoreEvents.Noop, noopListener)
              .once('error', errListener);

            const actor = createActor(flushQueueLogic, {
              input: {
                auxEmitter,
                ctx,
                queue: [{type: CoreEvents.Noop} as const],
                reporter,
              },
            });
            await runUntilDone(actor);

            expect(errListener, 'was called once').and(
              'to have a call satisfying',
              [expect.it('to be', err)],
            );
          });

          describe('when no "error" listener exists', function () {
            it('should reject with an UnknownError', async function () {
              const err = new Error('hoos-foos');
              const noopListener = sandbox.stub().throws(err);
              auxEmitter.once(CoreEvents.Noop, noopListener);

              const actor = createActor(flushQueueLogic, {
                input: {
                  auxEmitter,
                  ctx,
                  queue: [{type: CoreEvents.Noop} as const],
                  reporter,
                },
              });
              await expect(
                runUntilDone(actor),
                'to be rejected with error satisfying',
                {
                  cause: err,
                  code: ErrorCode.UnknownError,
                  message: err.message,
                },
              );
            });
          });
        });
      });
    });
  });
});
