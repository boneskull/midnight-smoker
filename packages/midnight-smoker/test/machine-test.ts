import {BaseSmokerOptionsSchema} from '#options/options';
import {PluginRegistry} from '#plugin';
import {
  nullExecutor,
  nullPmDef,
  registerPlugin,
} from '@midnight-smoker/test-util';
import Debug from 'debug';
import {createActor, fromPromise} from 'xstate';
import {type PkgManagerDefSpec} from '../src/component';
import {SmokerEvent} from '../src/event';
import {ControlMachine} from '../src/machine/controller/control-machine';
import {type PMCtrlExternalEvents} from '../src/machine/controller/control-machine-events';
import {
  PluginLoaderMachine,
  type LoadPkgManagersInput,
} from '../src/machine/plugin-loader-machine';

const debugComplete = Debug('testMachine:complete');
const debugError = Debug('testMachine:error');
const debugEvent = Debug('testMachine:event');
const debugEmit = Debug('testMachine:emit');

const failingPluginLoaderMachine = PluginLoaderMachine.provide({
  actors: {
    loadPkgManagers: fromPromise<PkgManagerDefSpec[], LoadPkgManagersInput>(
      async () => {
        throw new Error('broken');
      },
    ),
  },
});

const failingMachine = ControlMachine.provide({
  actors: {
    pluginLoader: failingPluginLoaderMachine,
  },
});

async function main() {
  const pluginRegistry = PluginRegistry.create();
  await registerPlugin(pluginRegistry, {
    factory: (api) => {
      api.defineExecutor(nullExecutor, 'default');
      // cheap way to clone a function
      api.defineExecutor(nullExecutor.bind({}), 'system');
      api.definePackageManager(nullPmDef, 'nullpm');
      api.defineReporter({
        name: 'console',
        when: () => true,
        description: 'null reporter',
      });
    },
    name: '@midnight-smoker/plugin-default',
  });

  const debug = Debug('pmCtrl');
  // const m = createActor(failingMachine, {
  const m = createActor(ControlMachine, {
    input: {
      pluginRegistry,
      desiredPkgManagers: ['nullpm@1.0.0'],
      packOptions: {
        allWorkspaces: true,
      },
      smokerOptions: BaseSmokerOptionsSchema.parse({reporter: ['console']}),
    },
    id: 'main',
    logger: debug,
    inspect: (evt) => {
      if (evt.type === '@xstate.event') {
        debugEvent(`${evt.actorRef.id}: %s`, evt.event.type);
      }
    },
  });

  m.start();

  const emitted = new Set<string>();
  const listener = (evt: PMCtrlExternalEvents) => {
    debugEmit(evt.type);
    emitted.add(evt.type);
  };

  for (const event of Object.values(SmokerEvent)) {
    m.on(event, listener);
  }

  const runningScripts = false;
  m.subscribe({
    complete() {
      debugComplete(m.getSnapshot().output);

      debugComplete(emitted);
    },
    error: (err) => {
      debugError(err);
    },
    // next(value) {
    //   if (value.matches('ready') && !runningScripts) {
    //     m.send({type: 'RUN_SCRIPTS', scripts: ['build']});
    //     runningScripts = true;
    //     setTimeout(() => {
    //       m.send({type: 'HALT'});
    //     }, 2000);
    //   }
    // },
  });

  m.send({type: 'INIT'});
  m.send({type: 'RUN_SCRIPTS', scripts: ['build']});
  setTimeout(() => {
    m.send({type: 'HALT'});
  }, 5);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
