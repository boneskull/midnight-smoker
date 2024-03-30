import {PluginRegistry} from '#plugin';
import {
  nullExecutor,
  nullPmDef,
  registerPlugin,
} from '@midnight-smoker/test-util';
import Debug from 'debug';
import {createActor} from 'xstate';
import {pkgManagerControlMachine} from '../src/controller/pkgManagerControlMachine';

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
    },
    id: 'main',
    logger: debug,
  });

  m.start();

  m.subscribe({
    complete() {
      console.log(m.getSnapshot().output);
    },
    error: (err) => {
      console.error(err);
    },
    next(value) {
      if (value.matches('loaded')) {
        m.send({type: 'PACK', opts: {allWorkspaces: true}});
      } else if (value.matches('ready')) {
        m.send({type: 'RUN_SCRIPTS', scripts: ['build']});
      }
    },
  });

  m.send({type: 'INIT'});
}

main();
