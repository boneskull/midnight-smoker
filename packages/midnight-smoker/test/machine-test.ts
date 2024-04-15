import {BaseSmokerOptionsSchema} from '#options/options';
import {PluginRegistry} from '#plugin';
import {ConsoleReporter} from '@midnight-smoker/plugin-default/reporter';
import {
  nullExecutor,
  nullPmDef,
  registerPlugin,
} from '@midnight-smoker/test-util';
import Debug from 'debug';
import {createActor} from 'xstate';
import {SmokerEvent} from '../src/event';
import {ControlMachine} from '../src/machine/controller/control-machine';
import {type CtrlEmitted} from '../src/machine/controller/control-machine-events';

const debugComplete = Debug('testMachine:complete');
const debugError = Debug('testMachine:error');
const debugEvent = Debug('testMachine:event');
const debugEmit = Debug('testMachine:emit');
const debugOther = Debug('testMachine:inspection');

// const failingPluginLoaderMachine = PluginLoaderMachine.provide({
//   actors: {
//     loadPkgManagers: fromPromise<PkgManagerDefSpec[], LoadPkgManagersInput>(
//       async () => {
//         throw new Error('broken');
//       },
//     ),
//   },
// });

// const failingMachine = ControlMachine.provide({
//   actors: {
//     pluginLoader: failingPluginLoaderMachine,
//   },
// });

async function main() {
  const pluginRegistry = PluginRegistry.create();
  await registerPlugin(pluginRegistry, {
    factory: (api) => {
      api.defineExecutor(nullExecutor, 'default');
      // cheap way to clone a function
      api.defineExecutor(nullExecutor.bind({}), 'system');
      api.definePackageManager(nullPmDef, 'nullpm');
      api.defineReporter(ConsoleReporter);
      // api.defineReporter(JSONReporter);
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
      smokerOptions: BaseSmokerOptionsSchema.parse({
        reporter: ['console'],
      }),
    },
    id: 'main',
    logger: debug,
    inspect: (evt) => {
      if (evt.type === '@xstate.event') {
        debugEvent(`${evt.actorRef.id}: %s`, evt.event.type);
      } else if (evt.actorRef.id.startsWith('InstallMachine.')) {
        // debugOther(evt);
      }
    },
  });

  m.start();

  const emitted = new Set<string>();
  const listener = (evt: CtrlEmitted) => {
    // debugEmit(evt.type);
    emitted.add(evt.type);
  };

  for (const event of Object.values(SmokerEvent)) {
    // @ts-expect-error stuff
    m.on(event, listener);
  }

  const runningScripts = false;
  m.subscribe({
    complete() {
      // debugComplete(m.getSnapshot().output);

      debugComplete(emitted);
    },
    error: (err) => {
      debugError(err);
    },
    next(value) {
      // if (value.matches('ready') && !runningScripts) {
      //   m.send({type: 'RUN_SCRIPTS', scripts: ['build']});
      //   runningScripts = true;
      //   setTimeout(() => {
      //     m.send({type: 'HALT'});
      //   }, 2000);
      // }
    },
  });

  m.send({type: 'RUN_SCRIPTS', scripts: ['build']});
  m.send({type: 'LINT'});
  setTimeout(() => {
    m.send({type: 'HALT'});
  }, 10000);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
