import {
  PackEvents,
  type PkgManager,
  type PkgManagerEnvelope,
  type PkgManagerPackContext,
  type PkgManagerSpec,
} from 'midnight-smoker';
import {afterEach, beforeEach, describe, it} from 'node:test';
import sinon from 'sinon';
import unexpected from 'unexpected';

import {pack} from '../../src/pack-wrapper';
import {
  makePkgManagerPackContext,
  nullPkgManager,
  nullPkgManagerSpec,
  testPlugin,
  workspaceInstallManifest,
} from './fixture';

const expect = unexpected.clone().use(require('unexpected-sinon'));

describe('pack-wrapper', () => {
  let sandbox: sinon.SinonSandbox;
  let envelope: PkgManagerEnvelope;
  let contexts: PkgManagerPackContext[];
  let pkgManager: PkgManager;
  let packStub: sinon.SinonStub;
  let spec: PkgManagerSpec;
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    packStub = sandbox.stub().resolves(workspaceInstallManifest);
    pkgManager = {...nullPkgManager, pack: packStub};
    spec = nullPkgManagerSpec.clone();
    envelope = {
      id: 'nullpm',
      pkgManager,
      plugin: testPlugin,
      spec,
    };
    contexts = [makePkgManagerPackContext(spec)];
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('when packing succeeds', () => {
    it('should return PackMachineEmitted events', async () => {
      const result = await pack(envelope, contexts);
      expect(result, 'to satisfy', [{type: PackEvents.PkgPackOk}]);
    });
  });

  describe('when packing fails', () => {
    beforeEach(() => {
      packStub.rejects(new Error('Pack failed'));
    });

    it('should reject with an AggregateError', async () => {
      await expect(
        pack(envelope, contexts),
        'to be rejected with error satisfying',
        expect.it('to be an', AggregateError),
      );
    });
  });

  describe('when actor completes', () => {
    it('should resolve the promise with results', async () => {
      const result = await pack(envelope, contexts);
      expect(result, 'to be an array');
    });
  });
});
