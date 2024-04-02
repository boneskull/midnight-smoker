import {PluginRegistry} from '#plugin';
import {
  nullExecutor,
  nullPmDef,
  registerPlugin,
} from '@midnight-smoker/test-util';
import Debug from 'debug';
import {createActor} from 'xstate';
import {pkgManagerControlMachine} from '../src/controller/pkgManagerControlMachine';
import {SmokerEvent} from '../src/event';

const debug = Debug('testMachine');
const debugComplete = Debug('testMachine:complete');
const debugError = Debug('testMachine:error');
const debugEvent = Debug('testMachine:event');

async function main() {
  const pluginRegistry = PluginRegistry.create();
  await registerPlugin(pluginRegistry, {
    factory: (api) => {
      api.defineExecutor(nullExecutor, 'default');
      // cheap way to clone a function
      api.defineExecutor(nullExecutor.bind({}), 'system');
      api.definePackageManager(nullPmDef, 'nullpm');
    },
    name: '@midnight-smoker/plugin-default',
  });

  const debug = Debug('pmCtrl');
  const m = createActor(pkgManagerControlMachine, {
    input: {
      pluginRegistry,
      desiredPkgManagers: ['nullpm@1.0.0'],
      packOptions: {
        allWorkspaces: true,
      },
    },
    id: 'main',
    logger: debug,
  });

  m.start();

  m.subscribe({
    complete() {
      debugComplete(m.getSnapshot().output);
    },
    error: (err) => {
      debugError(err);
    },
    next(value) {
      if (value.matches('ready')) {
        m.send({type: 'RUN_SCRIPTS', scripts: ['build']});
      }
    },
  });

  const debugListener = (e: {type: string}) => {
    debugEvent(e.type);
  };

  m.on(SmokerEvent.PackOk, debugListener);
  m.on(SmokerEvent.InstallOk, debugListener);
  m.on(SmokerEvent.RunScriptBegin, debugListener);
  m.on(SmokerEvent.RunScriptOk, debugListener);
  m.on(SmokerEvent.RunScriptFailed, debugListener);
  m.on(SmokerEvent.RunScriptsBegin, debugListener);
  m.on(SmokerEvent.RunScriptsOk, debugListener);
  m.on(SmokerEvent.RunScriptsFailed, debugListener);

  m.send({type: 'INIT'});
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
