// import {
//   FINAL,
//   type InstallError,
//   type InstallManifest,
//   type PkgManagerEnvelope,
//   type SomePackError,
//   type WorkspaceInfo,
// } from 'midnight-smoker';
// import {assert, R} from 'midnight-smoker/util';
// import {assign, enqueueActions, log, setup} from 'xstate';

// export interface TarballInstallerMachineContext
//   extends TarballInstallerMachineInput {
//   installError?: InstallError;
//   packError?: SomePackError;
//   shouldShutdown: boolean;
// }

// export interface TarballInstallerMachineInput {
//   additionalDeps?: string[];
//   envelope: PkgManagerEnvelope;
//   workspaceInfo: WorkspaceInfo[];
// }

// export const TarballInstallerMachine = setup({
//   actions: {
//     /**
//      * Creates install manifests for each additional dep and appends them as
//      * {@link InstallManifest}s to the install queue
//      */
//     enqueueAdditionalDeps: enqueueActions(
//       (
//         {context: {additionalDeps = [], workspaceInfo}, enqueue},
//         {
//           installManifests = [],
//           installQueue = [],
//           tmpdir,
//         }: {
//           installManifests?: InstallManifest[];
//           installQueue?: InstallManifest[];
//           tmpdir: string;
//         },
//       ) => {
//         if (R.isEmpty(workspaceInfo) || R.isEmpty(additionalDeps)) {
//           return;
//         }
//         assert.ok(tmpdir);
//         assert.ok(R.isEmpty(installQueue));
//         const newInstallManifests: InstallManifest[] = additionalDeps.map(
//           (dep) => ({
//             cwd: tmpdir,
//             isAdditional: true,
//             pkgName: dep,
//             pkgSpec: dep,
//           }),
//         );
//         // enqueue.assign({
//         //   installQueue: [...installQueue, ...newInstallManifests],
//         // });
//         // enqueue.assign({
//         //   installManifests: [...installManifests, ...newInstallManifests],
//         // });
//       },
//     ),
//     freeInstallError: assign({
//       installError: undefined,
//     }),
//     freePackError: assign({
//       packError: undefined,
//     }),
//   },
//   guards: {
//     shouldShutdown: ({context: {shouldShutdown}}) => shouldShutdown,
//   },
//   types: {
//     context: {} as TarballInstallerMachineContext,
//     input: {} as TarballInstallerMachineInput,
//   },
// }).createMachine({
//   context: ({input}) => ({...input, shouldShutdown: false}),
//   states: {
//     working: {
//       description:
//         'This is where most things happen. As soon as a pkg is packed, it will be installed. As soon as it is installed, we can lint or run scripts; this all happens in parallel',
//       // we can start installing additional deps as soon as we have a tmpdir
//       entry: 'enqueueAdditionalDeps',
//       onDone: [
//         {
//           actions: [log('🏁 Work complete; shutting down')],
//           guard: 'shouldShutdown',
//           target: 'shutdown',
//         },
//         {
//           actions: log('⏪ Work complete; returning to idle'),
//           target: 'idle',
//         },
//       ],
//       states: {
//         installing: {
//           description:
//             'Installs tarballs and additional deps in serial. If anything operation throws or rejects in this state, the machine will abort',
//           exit: ['freeInstallError'],
//           initial: 'idle',
//           states: {
//             done: {
//               entry: [
//                 log(
//                   ({context: {installManifests = []}}) =>
//                     `🟢 Installation of ${installManifests.length} package(s) complete`,
//                 ),
//               ],
//               type: FINAL,
//             },
//             errored: {
//               entry: [log('🔴 Installation errored; aborting'), 'abort'],
//               type: FINAL,
//             },
//             idle: {
//               always: {
//                 guard: 'hasInstallJobs',
//                 target: 'installingPkgs',
//               },
//               description:
//                 'Waits until install jobs are available, then transitions to next state',
//             },
//             installingPkgs: {
//               entry: 'sendPkgManagerInstallBegin',
//               exit: 'sendPkgManagerInstallEnd',
//               initial: 'installPkg',
//               onDone: [
//                 {
//                   guard: 'hasInstallError',
//                   target: 'errored',
//                 },
//                 {
//                   target: 'done',
//                 },
//               ],
//               states: {
//                 done: {
//                   type: FINAL,
//                 },
//                 errored: {
//                   type: FINAL,
//                 },
//                 installedPkg: {
//                   always: [
//                     {
//                       guard: 'hasInstallJobs',
//                       target: 'installPkg',
//                     },
//                     {
//                       guard: 'isInstallationComplete',
//                       target: 'done',
//                     },
//                   ],
//                 },
//                 installPkg: {
//                   entry: ['takeInstallJob', 'sendPkgInstallBegin'],
//                   invoke: {
//                     input: ({
//                       context: {ctx, currentInstallJob, envelope},
//                     }): InstallLogicInput => {
//                       assert.ok(currentInstallJob);
//                       assert.ok(ctx);

//                       return {
//                         ctx: {
//                           ...ctx,
//                           installManifest: currentInstallJob,
//                         },
//                         envelope,
//                       };
//                     },
//                     onDone: {
//                       actions: [
//                         // TODO combine?
//                         {
//                           params: ({event: {output}}) => output,
//                           type: 'sendPkgInstallOk',
//                         },
//                         {
//                           params: ({event: {output}}) => output,
//                           type: 'appendInstallResult',
//                         },
//                         {
//                           params: ({event: {output}}) => output,
//                           type: 'handleInstallResult',
//                         },
//                       ],
//                       target: 'installedPkg',
//                     },
//                     onError: {
//                       actions: {
//                         params: ({event: {error}}) =>
//                           error as AbortError | InstallError,
//                         type: 'handleInstallFailure',
//                       },
//                       target: 'errored',
//                     },

//                     src: 'install',
//                   },
//                 },
//               },
//             },
//           },
//         },
//         packing: {
//           description:
//             'Packs chosen workspaces in parallel. If an error occurs in this state, the machine will abort',
//           exit: 'freePackError',
//           initial: 'idle',
//           states: {
//             done: {
//               entry: [
//                 log(
//                   ({context: {workspaceInfo}}) =>
//                     `🟢 Packing of ${workspaceInfo.length} workspace(s) completed successfully`,
//                 ),
//                 'sendPkgManagerPackEnd',
//               ],
//               type: FINAL,
//             },
//             errored: {
//               entry: [
//                 log('🔴 Packing failed miserably'),
//                 'sendPkgManagerPackEnd',
//                 'abort',
//               ],
//               type: FINAL,
//             },
//             idle: {
//               always: 'packingPkgs',
//               description: 'Sends PackBegin and gets to packing',
//               entry: 'sendPkgManagerPackBegin',
//             },
//             packingPkgs: {
//               always: [
//                 {
//                   guard: 'isPackingComplete',
//                   target: 'done',
//                 },
//                 {
//                   actions: [
//                     log(
//                       ({context: {packQueue}}) =>
//                         `📦 Packing pkg "${head(packQueue)!.pkgName}"`,
//                     ),
//                     'spawnPackActor',
//                     'pkgPackBegin',
//                   ],
//                   guard: 'hasPackJobs',
//                   target: 'packingPkgs',
//                 },
//               ],
//               on: {
//                 'xstate.done.actor.pack.*': {
//                   // TODO: combine
//                   actions: [
//                     {
//                       params: ({event: {output}}) => output,
//                       type: 'appendInstallManifest',
//                     },
//                     {
//                       params: ({event: {output}}) => output,
//                       type: 'sendPkgPackOk',
//                     },
//                     {
//                       params: ({event: {actorId}}) => actorId,
//                       type: 'stopPackActor',
//                     },
//                   ],
//                 },
//                 'xstate.error.actor.pack.*': {
//                   actions: [
//                     {
//                       params: ({event: {error}}) => error,
//                       type: 'handlePackFailure',
//                     },
//                     {
//                       params: ({event: {actorId}}) => actorId,
//                       type: 'stopPackActor',
//                     },
//                   ],
//                   target: 'errored',
//                 },
//               },
//             },
//           },
//         },
//       },
//       type: PARALLEL,
//     },
//   },
// });
