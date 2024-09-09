import {
  setupReporterLogic,
  teardownReporterLogic,
} from '#machine/actor/reporter-lifecycle';
import {type OmitSignal} from '#machine/util/index';
import {type StaticPluginMetadata} from '#plugin/static-plugin-metadata';
import {type ReporterContext} from '#reporter/reporter-context';
import {type Reporter} from '#schema/reporter';
import {type SmokerOptions} from '#schema/smoker-options';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {type Actor, createActor} from 'xstate';
import {runUntilDone} from 'xstate-audition';

import {nullReporter} from '../../mocks/index.js';
const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('actor', function () {
    let sandbox: sinon.SinonSandbox;
    let reporter: Reporter;
    let ctx: OmitSignal<ReporterContext>;

    beforeEach(function () {
      sandbox = createSandbox();
      reporter = {...nullReporter};
      ctx = {
        opts: {} as SmokerOptions,
        pkgJson: {name: 'foo', version: '1.0.0'},
        plugin: {} as StaticPluginMetadata,
      };
    });

    afterEach(function () {
      sandbox.restore();
    });

    describe('setupReporterLogic()', function () {
      let actor: Actor<typeof setupReporterLogic>;

      beforeEach(function () {
        actor = createActor(setupReporterLogic, {input: {ctx, reporter}});
        sandbox.stub(reporter, 'setup');
      });

      it('should call the "setup" lifecycle hook', async function () {
        await runUntilDone(actor);
        expect(reporter.setup, 'was called once');
      });

      describe('when the "setup" lifecycle hook throws', function () {
        let err: Error;

        beforeEach(function () {
          err = new Error('schmetup');
          reporter.setup = sandbox.stub().throws(err);
        });

        it('should reject', async function () {
          await expect(runUntilDone(actor), 'to be rejected with', err);
        });
      });

      describe('when the "setup" lifecycle hook rejects', function () {
        let err: Error;

        beforeEach(function () {
          err = new Error('schmetup');
          reporter.setup = sandbox.stub().rejects(err);
        });

        it('should reject', async function () {
          await expect(() => runUntilDone(actor), 'to be rejected with', err);
        });
      });
    });

    describe('teardownReporterLogic()', function () {
      let actor: Actor<typeof teardownReporterLogic>;

      beforeEach(function () {
        sandbox.stub(reporter, 'teardown');
        actor = createActor(teardownReporterLogic, {input: {ctx, reporter}});
      });

      it('should call the "teardown" lifecycle hook', async function () {
        await runUntilDone(actor);
        expect(reporter.teardown, 'was called once');
      });

      describe('when the "teardown" lifecycle hook throws', function () {
        let err: Error;

        beforeEach(function () {
          err = new Error('schmaredown');
          reporter.teardown = sandbox.stub().throws(err);
        });

        it('should reject', async function () {
          await expect(runUntilDone(actor), 'to be rejected with', err);
        });
      });

      describe('when the "teardown" lifecycle hook rejects', function () {
        let err: Error;

        beforeEach(function () {
          err = new Error('schmaredown');
          reporter.teardown = sandbox.stub().rejects(err);
        });

        it('should reject', async function () {
          await expect(runUntilDone(actor), 'to be rejected with', err);
        });
      });
    });
  });
});
