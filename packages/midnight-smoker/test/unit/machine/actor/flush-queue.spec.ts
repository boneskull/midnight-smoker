import {CoreEvents} from '#constants';
import {type StaticPluginMetadata} from '#defs/plugin';
import {
  type Observer,
  type Reporter,
  type ReporterContext,
  type Subscription,
} from '#defs/reporter';
import {ErrorCode} from '#error/codes';
import {type EventData} from '#event/events';
import {flushQueueLogic} from '#machine/actor/flush-queue';
import {ReporterContextObserver} from '#reporter/reporter-context';
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
      let ctx: ReporterContext;
      let subject: ReporterContextObserver;
      let queue: EventData[];

      beforeEach(function () {
        sandbox = createSandbox();
        reporter = {...nullReporter};
        queue = [{type: CoreEvents.Noop} as const];
        subject = ReporterContextObserver.create();
        ctx = subject.createReporterContext(
          {} as SmokerOptions,
          {name: 'foo', version: '1.0.0'},
          {} as StaticPluginMetadata,
        );
        actor = createActor(flushQueueLogic, {
          input: {ctx, queue, reporter, subject},
        });
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

      describe('when the actor is aborted', function () {
        let auxEmitter: EventEmitter;

        beforeEach(function () {
          auxEmitter = new EventEmitter();
        });

        afterEach(function () {
          auxEmitter.removeAllListeners();
        });

        it('should return without processing the queue', async function () {
          const eeListener = sandbox.stub();
          const next = sandbox.stub();
          const onNoop = sandbox.stub();

          // listen for auxEmitter
          auxEmitter.once(CoreEvents.Noop, eeListener);

          // listen using observer
          ctx.subscribe({next});

          // listen using ReporterListener
          reporter.onNoop = onNoop;

          actor = createActor(flushQueueLogic, {
            input: {auxEmitter, ctx, queue, reporter},
          });
          const p = runUntilDone(actor);
          actor.stop();
          await p;

          expect(eeListener, 'was not called');
          expect(next, 'was not called');
          expect(onNoop, 'was not called');
        });
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
          it('should reject with a ReporterError', async function () {
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

            await expect(
              runUntilDone(actor),
              'to be rejected with error satisfying',
              {
                cause: err,
                code: ErrorCode.ReporterError,
              },
            );
          });

          describe('when no "error" listener exists', function () {
            it('should reject with a ReporterError', async function () {
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
                  code: ErrorCode.ReporterError,
                },
              );
            });
          });
        });
      });

      describe('when the ReporterContext has subscribers', function () {
        let subscription: Subscription;
        let next: sinon.SinonStub;

        beforeEach(function () {
          next = sandbox.stub();
          // NOTE: we don't care about error or complete since they won't be called from flushQueueLogic
          subscription = ctx.subscribe({next});
        });

        afterEach(function () {
          subscription?.unsubscribe();
        });

        it('should notify the subscribers', async function () {
          expect(next, 'was not called');

          await runUntilDone(actor);

          expect(next, 'was called once').and('to have a call satisfying', [
            {type: CoreEvents.Noop},
          ]);
        });

        describe('when the handler throws', function () {
          let observer: Observer<EventData>;
          let err: Error;

          beforeEach(function () {
            err = new Error('snimm');
            observer = {
              complete: sandbox.stub(),
              error: sandbox.stub(),
              next: sandbox.stub().throws(err),
            };
            subscription?.unsubscribe();
            subscription = ctx.subscribe(observer);
          });

          it('should rethrow the error wrapped in a ReporterError', async function () {
            await expect(
              runUntilDone(actor),
              'to be rejected with error satisfying',
              {
                cause: err,
                code: ErrorCode.ReporterError,
              },
            );
          });

          it('should never call the "error" handler', async function () {
            try {
              await runUntilDone(actor);
              expect.fail('Expected a rejection');
            } catch {
            } finally {
              expect(observer.error, 'was not called');
            }
          });

          it('should never call the "complete" handler', async function () {
            try {
              await runUntilDone(actor);
              expect.fail('Expected a rejection');
            } catch {
            } finally {
              expect(observer.complete, 'was not called');
            }
          });
        });
      });
    });
  });
});
