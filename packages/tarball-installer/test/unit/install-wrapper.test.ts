import {
  InstallEvents,
  type InstallManifest,
  type PkgManagerContext,
  type PkgManagerEnvelope,
} from 'midnight-smoker';
import {afterEach, beforeEach, describe, it} from 'node:test';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

import {install} from '../../src/install-wrapper';
import {
  nullPkgManager,
  nullPkgManagerSpec,
  testPkgManagerContext,
  testPlugin,
  workspaceInstallManifest,
} from './fixture';

const expect = unexpected.clone().use(unexpectedSinon);

describe('install', () => {
  describe('install-wrapper', () => {
    let sandbox: sinon.SinonSandbox;
    let manifests: InstallManifest[];
    let envelope: PkgManagerEnvelope;
    let ctx: PkgManagerContext;
    let installStub: sinon.SinonStub;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      manifests = [workspaceInstallManifest];
      envelope = {
        id: 'nullpm',
        pkgManager: {...nullPkgManager},
        plugin: testPlugin,
        spec: nullPkgManagerSpec.clone(),
      };
      ctx = {...testPkgManagerContext};
      installStub = sandbox
        .stub(envelope.pkgManager, 'install')
        .resolves({command: '', cwd: '', exitCode: 0, stderr: '', stdout: ''});
    });

    afterEach(() => {
      sandbox.restore();
    });

    describe('when installation succeeds', () => {
      it('should return InstallMachineEmitted events', async () => {
        const result = await install(manifests, envelope, ctx);
        expect(result, 'to satisfy', [{type: InstallEvents.PkgInstallOk}]);
      });
    });

    describe('when installation fails', () => {
      beforeEach(() => {
        installStub.rejects(new Error('Install failed'));
      });

      it('should reject with an AggregateError', async () => {
        await expect(
          install(manifests, envelope, ctx),
          'to be rejected with error satisfying',
          expect.it('to be an', AggregateError),
        );
      });
    });

    describe('when actor completes', () => {
      it('should resolve the promise with results', async () => {
        const result = await install(manifests, envelope, ctx);
        expect(result, 'to be an array');
      });
    });

    describe('when there are multiple manifests', () => {
      beforeEach(() => {
        manifests = [workspaceInstallManifest, workspaceInstallManifest];
      });

      it('should handle multiple manifests', async () => {
        const result = await install(manifests, envelope, ctx);
        expect(result, 'to have length', manifests.length);
      });
    });

    describe('when there are errors', () => {
      beforeEach(() => {
        installStub.rejects(new Error('Install failed'));
      });

      it('should collect errors and reject with an AggregateError', async () => {
        await expect(
          install(manifests, envelope, ctx),
          'to be rejected with error satisfying',
          expect.it('to be an', AggregateError),
        );
      });
    });
  });
});
