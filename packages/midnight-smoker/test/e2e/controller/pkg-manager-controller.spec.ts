import {PkgManagerController} from '#controller';
import {EventBus, SmokerEvent, type SmokerEventBus} from '#event';
import {PluginRegistry} from '#plugin';
import {
  nullExecutor,
  nullPmDef,
  registerPlugin,
} from '@midnight-smoker/test-util';
import {createSandbox, type SinonSandbox} from 'sinon';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker [E2E]', function () {
  describe('controller', function () {
    describe('PkgManagerController', function () {
      let ctrl: PkgManagerController;
      let registry: PluginRegistry;
      let sandbox: SinonSandbox;
      let eventBus: SmokerEventBus;
      beforeEach(async function () {
        registry = PluginRegistry.create();
        eventBus = EventBus.create();
        sandbox = createSandbox();
        await registerPlugin(registry, {
          factory: (api) => {
            api.defineExecutor(nullExecutor, 'default');
            // cheap way to clone a function
            api.defineExecutor(nullExecutor.bind({}), 'system');
            api.definePackageManager(nullPmDef, 'nullpm');
          },
          name: '@midnight-smoker/plugin-default',
        });
        ctrl = new PkgManagerController(
          registry,
          eventBus,
          ['nullpm@1'], // this is now needed
          {},
        );
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('init()', function () {
        it('should initialize each package manager', async function () {
          await ctrl.init();
          expect(ctrl.pkgManagers, 'to have length', 1).and('to satisfy', [
            {
              def: nullPmDef,
            },
          ]);
        });
      });

      describe('pack()', function () {
        describe('when packing succeeds', function () {
          beforeEach(async function () {
            sandbox.stub(nullPmDef, 'pack').resolves([
              {
                isAdditional: false,
                pkgSpec: 'foo@1.0.0',
                pkgName: 'foo',
                cwd: '/somewhere',
                installPath: '/somewhere/node_modules/foo',
              },
            ]);
            await ctrl.init();
          });

          it('should resolve', async function () {
            await expect(ctrl.pack(), 'to be fulfilled');
          });

          it('should set the installManifest prop of the affected PkgManagers', async function () {
            await ctrl.pack();

            expect(ctrl.pkgManagers[0].installManifests, 'to have length', 1);
          });

          it('should emit PackBegin', async function () {
            await ctrl.pack();

            expect(eventBus.emit, 'to have a call satisfying', [
              SmokerEvent.PackBegin,
              {},
            ]);
          });

          it('should emit PackOk', async function () {
            await ctrl.pack();

            expect(eventBus.emit, 'to have a call satisfying', [
              SmokerEvent.PackOk,
              {},
            ]);
          });
        });
      });

      // describe('when packing fails', function () {
      //   describe('with a non-PackError', function () {
      //     let err: Error;
      //     beforeEach(function () {
      //       err = new Error('stuff');
      //       sandbox.stub(nullPm1, 'pack').rejects(err);
      //     });

      //     it('should reject', async function () {
      //       await expect(
      //         ctrl.pack(),
      //         'to be rejected with error satisfying',
      //         err,
      //       );
      //     });

      //     it('should not emit PackFailed', function () {
      //       return expect(
      //         () => ctrl.pack().catch(() => {}),
      //         'not to emit from',
      //         ctrl,
      //         SmokerEvent.PackFailed,
      //       );
      //     });
      //   });

      //   describe('with a PackError', function () {
      //     let err: Errors.PackError;

      //     beforeEach(function () {
      //       err = new Errors.PackError('oh no', nullPm1.spec, TEST_TMPDIR);
      //       sandbox.stub(nullPm1, 'pack').rejects(err);
      //     });

      //     it('should emit PackFailed with the PackError', async function () {
      //       await expect(
      //         () => ctrl.pack().catch(() => {}),
      //         'to emit from',
      //         ctrl,
      //         SmokerEvent.PackFailed,
      //         {error: err},
      //       );
      //     });
      //   });
      // });
    });
  });
});
