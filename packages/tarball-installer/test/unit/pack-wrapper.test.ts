import {
  PackEvents,
  type PkgManager,
  type PkgManagerContext,
  type PkgManagerEnvelope,
  type PkgManagerSpec,
} from 'midnight-smoker';
import {afterEach, beforeEach, describe, it} from 'node:test';
import sinon from 'sinon';
import unexpected from 'unexpected';

import {pack} from '../../src/pack-wrapper';
import {
  nullPkgManager,
  nullPkgManagerSpec,
  testPkgManagerContext,
  testPlugin,
  workspaceInstallManifest,
} from './fixture';

const expect = unexpected.clone().use(require('unexpected-sinon'));

describe('pack', () => {
  describe('pack-wrapper', () => {
    let sandbox: sinon.SinonSandbox;
    let envelope: PkgManagerEnvelope;
    let pkgManager: PkgManager;
    let packStub: sinon.SinonStub;
    let spec: PkgManagerSpec;
    let ctx: PkgManagerContext;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      packStub = sandbox.stub().resolves(workspaceInstallManifest);
      pkgManager = {...nullPkgManager, pack: packStub};
      ctx = {...testPkgManagerContext};
      spec = nullPkgManagerSpec.clone();
      envelope = {
        id: 'nullpm',
        pkgManager,
        plugin: testPlugin,
        spec,
      };
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('when packing succeeds', () => {
      it('should return PackMachineEmitted events', async () => {
        const result = await pack(envelope, ctx);
        expect(result, 'to satisfy', [{type: PackEvents.PkgPackOk}]);
      });
    });

    describe('when packing fails', () => {
      beforeEach(() => {
        packStub.rejects(new Error('Pack failed'));
      });

      it('should reject with an AggregateError', async () => {
        await expect(
          pack(envelope, ctx),
          'to be rejected with error satisfying',
          expect.it('to be an', AggregateError),
        );
      });
    });

    describe('when actor completes', () => {
      it('should resolve the promise with results', async () => {
        const result = await pack(envelope, ctx);
        expect(result, 'to be an array');
      });
    });
  });
});
