import {
  type PackError,
  type PackOptions,
  type PackParseError,
  type PkgManager,
} from '#pkg-manager';
import {type InstallManifest} from '#schema';
import {
  assign,
  fromPromise,
  log,
  sendTo,
  setup,
  type AnyActorRef,
} from 'xstate';
import {type MachineOutputError, type MachineOutputOk} from '../machine-util';
import {type PackResult} from './packer-machine';
import {type PackerMachinePkgManagerPackBeginEvent} from './packer-machine-events';

export interface PackMachineInput {
  signal: AbortSignal;
  pkgManager: PkgManager;
  opts?: PackOptions;
  parentRef: AnyActorRef;
  index: number;
}

export type PackActorInput = PackMachineInput;

export interface PackMachineContext extends PackMachineInput {
  result?: InstallManifest[];
  error?: PackError | PackParseError;
}

export type PackMachineOutputOk = MachineOutputOk<PackResult & {index: number}>;

export type PackMachineOutputError = MachineOutputError<
  PackError | PackParseError,
  {pkgManager: PkgManager; index: number}
>;

export type PackMachineOutput = PackMachineOutputOk | PackMachineOutputError;

export const PackMachine = setup({
  types: {
    input: {} as PackMachineInput,
    context: {} as PackMachineContext,
    output: {} as PackMachineOutput,
  },
  actions: {
    sendPackBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        context: {pkgManager, index},
      }): PackerMachinePkgManagerPackBeginEvent => ({
        type: 'PKG_MANAGER_PACK_BEGIN',
        pkgManager,
        index,
      }),
    ),
  },
  actors: {
    pack: fromPromise<InstallManifest[], PackActorInput>(
      async ({input: {signal, pkgManager, opts}}): Promise<InstallManifest[]> =>
        pkgManager.pack(signal, opts),
    ),
  },
}).createMachine({
  context: ({input}) => input,
  entry: [log(({context}) => `Packing for ${context.pkgManager.spec}`)],
  initial: 'packing',
  states: {
    packing: {
      entry: {type: 'sendPackBegin'},
      invoke: {
        src: 'pack',
        input: ({context}) => context,
        onDone: {
          actions: [
            log(
              ({context}) =>
                `successfully packed for ${context.pkgManager.spec}`,
            ),
            assign({
              result: ({event: {output}}) => output,
            }),
          ],
          target: 'done',
        },
        onError: {
          actions: [
            log(({context}) => `failed to pack for ${context.pkgManager.spec}`),
            assign({
              error: ({event: {error}}) => error as PackError | PackParseError,
            }),
          ],
          target: 'done',
        },
      },
    },
    done: {
      type: 'final',
    },
  },
  output: ({self: {id}, context: {pkgManager, result, error, index}}) =>
    error
      ? {type: 'ERROR', error, id, pkgManager, index}
      : {type: 'OK', installManifests: result!, id, pkgManager, index},
});
