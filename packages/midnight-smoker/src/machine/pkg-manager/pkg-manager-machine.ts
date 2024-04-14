// import {fromUnknownError} from '#error';
// import type {PkgManager} from '#pkg-manager';
// import {
//   type BaseNormalizedRuleOptionsRecord,
//   type InstallManifest,
//   type InstallResult,
//   type LintManifest,
//   type LintResult,
//   type PackOptions,
//   type RunScriptManifest,
//   type SomeRule,
// } from '#schema';
// import {type FileManager} from '#util';
// import {isEmpty} from 'lodash';
// import {
//   assign,
//   enqueueActions,
//   log,
//   not,
//   sendTo,
//   setup,
//   type ActorRefFrom,
//   type AnyActorRef,
// } from 'xstate';
// import type * as CtrlEvent from '../controller/control-machine-events';
// import {
//   assertMachineOutputNotOk,
//   assertMachineOutputOk,
//   makeId,
//   monkeypatchActorLogger,
//   type MachineOutputError,
//   type MachineOutputLike,
//   type MachineOutputOk,
// } from '../machine-util';
// import {type RMOutput} from '../rule-machine';
// import type * as ScriptEvent from '../runner/run-machine';
// import {
//   RuleMachine,
//   ScriptRunnerMachine,
//   runScripts,
// } from './pkg-manager-machine-actors';
// import {
//   type PMMEvents,
//   type PMMRuleFailedEvent,
//   type PMMRuleOkEvent,
// } from './pkg-manager-machine-events';

// export interface PMMInput {
//   pkgManager: PkgManager;
//   rules: SomeRule[];
//   packOptions?: PackOptions;

//   ruleOptions: BaseNormalizedRuleOptionsRecord;

//   fileManager: FileManager;

//   /**
//    * Index of this package manager in the list of loaded package managers.
//    */
//   index: number;

//   parentRef: AnyActorRef;
// }

// export interface PMMContext extends PMMInput {
//   installManifests: InstallManifest[];
//   installResult?: InstallResult;
//   runScriptManifests: RunScriptManifest[];
//   abortController: AbortController;
//   scriptRunnerMachines: Record<
//     string,
//     ActorRefFrom<typeof ScriptRunnerMachine>
//   >;
//   ruleMachines: Record<string, ActorRefFrom<typeof RuleMachine>>;
//   error?: Error;

//   lintResults?: LintResult[];
// }

// export type PMMOutputOk = MachineOutputOk;
// export type PMMOutputError = MachineOutputError;

// export type PMMOutput = PMMOutputOk | PMMOutputError;

// export const PkgManagerMachine = setup({
//   types: {
//     context: {} as PMMContext,
//     events: {} as PMMEvents,
//     input: {} as PMMInput,
//     output: {} as PMMOutput,
//   },
//   guards: {
//     hasRunScriptManifests: ({context: {runScriptManifests}}) =>
//       Boolean(runScriptManifests?.length),
//     hasScriptRunners: ({context: {scriptRunnerMachines}}) =>
//       !isEmpty(scriptRunnerMachines),
//     hasRuleMachines: ({context: {ruleMachines}}) => !isEmpty(ruleMachines),
//     notHasScriptRunners: not('hasScriptRunners'),
//     notHasRunScriptManifests: not('hasRunScriptManifests'),
//     machineErrored: (_, output: MachineOutputLike) => output.type === 'ERROR',
//     machineOk: (_, output: MachineOutputLike) => output.type === 'OK',
//     scriptCompleted: (_, output: ScriptEvent.RunMachineOutput) =>
//       output.type === 'RESULT',
//     scriptBailed: (_, output: ScriptEvent.RunMachineOutput) =>
//       output.type === 'BAILED',
//   },
//   actors: {
//     ruleMachine: RuleMachine,
//     scriptRunner: ScriptRunnerMachine,
//     runScripts,
//   },
//   actions: {
//     stopScriptRunner: enqueueActions(
//       (
//         {enqueue, context: {scriptRunnerMachines: scriptRunners}},
//         {id}: MachineOutputLike,
//       ) => {
//         enqueue.stopChild(id);
//         // eslint-disable-next-line @typescript-eslint/no-unused-vars
//         const {[id]: _, ...rest} = scriptRunners;
//         enqueue.assign({
//           scriptRunnerMachines: rest,
//         });
//       },
//     ),
//     stopRuleMachine: enqueueActions(
//       ({enqueue, context: {ruleMachines}}, {id}: MachineOutputLike) => {
//         enqueue.stopChild(id);
//         // eslint-disable-next-line @typescript-eslint/no-unused-vars
//         const {[id]: _, ...rest} = ruleMachines;
//         enqueue.assign({
//           ruleMachines: rest,
//         });
//       },
//     ),

//     assignError: assign({
//       error: (_, {error}: {error: unknown}) => fromUnknownError(error),
//     }),
//     assignRunScriptManifests: assign({
//       runScriptManifests: ({context: {pkgManager}}, scripts: string[]) =>
//         pkgManager.buildRunScriptManifests(scripts),
//     }),
//     sendDidLintEvent: sendTo(
//       ({context: {parentRef}}) => parentRef,
//       ({self}): CtrlEvent.CtrlDidLintEvent => ({
//         type: 'DID_RUN_RULES',
//         sender: self.id,
//       }),
//     ),
//     sendDidRunScriptsEvent: sendTo(
//       ({context: {parentRef}}) => parentRef,
//       (): CtrlEvent.CtrlRunScriptsOkEvent => ({
//         type: 'DID_RUN_SCRIPTS',
//       }),
//     ),
//     sendDidRunScriptResultEvent: sendTo(
//       ({context: {parentRef}}) => parentRef,
//       (
//         _,
//         {output}: {output: ScriptEvent.RunMachineOutputResult},
//       ): CtrlEvent.CtrlRunScriptOkEvent => ({
//         type: 'DID_RUN_SCRIPT_RESULT',
//         output,
//       }),
//     ),
//     sendDidRunScriptErrorEvent: sendTo(
//       ({context: {parentRef}}) => parentRef,
//       (
//         _,
//         {output}: {output: ScriptEvent.RunMachineOutputError},
//       ): CtrlEvent.CtrlRunScriptFailedEvent => ({
//         type: 'DID_RUN_SCRIPT_ERROR',
//         output,
//       }),
//     ),
//     sendDidRunScriptBailedEvent: sendTo(
//       ({context: {parentRef}}) => parentRef,
//       (
//         _,
//         {output}: {output: ScriptEvent.RunMachineOutputBailed},
//       ): CtrlEvent.CtrlRunScriptSkippedEvent => ({
//         type: 'DID_RUN_SCRIPT_BAILED',
//         output,
//       }),
//     ),
//     sendWillRunScriptEvent: sendTo(
//       ({context: {parentRef}}) => parentRef,
//       (
//         {context},
//         {
//           type,
//           runScriptManifest,
//           index: scriptIndex,
//         }: {
//           type: 'WILL_RUN_SCRIPT';
//           runScriptManifest: RunScriptManifest;
//           index: number;
//         },
//       ): CtrlEvent.CtrlRunScriptBeginEvent => {
//         const {index: pkgManagerIndex} = context;
//         return {
//           type,
//           runScriptManifest,
//           pkgManagerIndex,
//           scriptIndex,
//         };
//       },
//     ),

//     sendRuleFailed: sendTo(
//       ({context: {parentRef}}) => parentRef,
//       (_, event: PMMRuleFailedEvent): CtrlEvent.CtrlRuleFailedEvent => event,
//     ),
//     sendRuleOk: sendTo(
//       ({context: {parentRef}}) => parentRef,
//       (_, event: PMMRuleOkEvent): CtrlEvent.CtrlRuleOkEvent => event,
//     ),
//     spawnScriptRunners: assign({
//       scriptRunnerMachines: ({
//         self,
//         spawn,
//         context: {pkgManager, abortController, runScriptManifests},
//       }) =>
//         Object.fromEntries(
//           runScriptManifests.map((runScriptManifest, index) => {
//             const id = `scriptRunner.${makeId()}`;
//             const actor = spawn('scriptRunner', {
//               input: {
//                 pkgManager,
//                 runScriptManifest,
//                 signal: abortController.signal,
//                 index: index + 1,
//                 parentRef: self,
//               },
//               id,
//             });
//             return [id, monkeypatchActorLogger(actor, id)];
//           }),
//         ),
//     }),
//     spawnRuleMachines: assign({
//       ruleMachines: ({
//         self,
//         spawn,
//         context: {
//           fileManager,
//           installManifests,
//           rules,
//           ruleOptions,
//           index: pkgManagerIndex,
//         },
//       }) => {
//         const ruleMachines = Object.fromEntries(
//           rules.map((rule, ruleIndex) => {
//             const id = `ruleMachine.${makeId()}`;
//             const lintManifests = installManifests
//               .filter(({installPath, isAdditional}) =>
//                 Boolean(installPath && !isAdditional),
//               )
//               .map(
//                 ({pkgName, installPath}) =>
//                   ({
//                     pkgName,
//                     installPath,
//                   }) as LintManifest,
//               );
//             const ruleConfig = ruleOptions[rule.id];
//             const actor = spawn('ruleMachine', {
//               input: {
//                 fileManager,
//                 rule,
//                 ruleConfig,
//                 parentRef: self,
//                 lintManifests,
//                 index: (ruleIndex + 1) * pkgManagerIndex,
//               },
//               id,
//             });
//             return [id, monkeypatchActorLogger(actor, id)];
//           }),
//         );
//         return ruleMachines;
//       },
//     }),
//     assignLintResults: assign({
//       lintResults: (
//         {context: {lintResults = []}},
//         output: RMOutput,
//       ): LintResult[] => {
//         assertMachineOutputOk(output);
//         return [...lintResults, {passed: output.passed, issues: output.issues}];
//       },
//     }),
//   },
// }).createMachine({
//   /**
//    * @xstate-layout N4IgpgJg5mDOIC5QAUDWUCyBDAdlmATgMQBKAqgHID6AygMIkCSyAKjQNoAMAuoqAA4B7WAEsALiME4+IAB6IAjABYATAoB0yzkoUA2fUoDMnFQA4ANCACeilQF87ltJlz4wBdbDBiArvyIQUmDqIjgAboKowc7YeISe3n4IoREAxlgSUlzc2TJCopnSSHKIaobqKoZGKrqcCnq6pjWWNggKnIblnLoA7D36ugCcdQoArA5O6LFuHl6+-u4Egh78ADYZAGbLALbqMa7xc0kpgumF2bnF+eKSRaDyCGUVVYY1I-pNui2Ipkqc6qNBgozLVBoYeoCFBMQPs4u51PwsKlUKEoAEgiFwpFolMDvDEcjUcksWdbhceHlhDcpDIHqMVP9TMCakpAUpBoNdIZvm16qN1KpWZVTJwmiKlNDYTMEUiUTg0Ytlgj1mItgRdlL4gS5VBiWkMmSeJcBFTCrTEPTGczdKzBuzOdzrIhBqYegKVEouZ7TA7RlDHDDcXCVrLIERjSBrmbig8eipBpoIeCOh1PY0eSKVOpOEDDKM4yo-XbDJKg9LtWH2ApeFdTbdzW1tFmTENXiKqr0efVOG7ep72sNlEYJQHNfjQxBwyoayaCvWYz96upXayfZxRh30062ioGcvRqp8+0FIYuf7Ji5g5jYGIsKtVqj0Thgiconsy-FQje7w-5XrTgaWRGhStZzjSC47k06ickySh9Byp4KDyuiAhUoqnko7L5toPSlpe0pfre96PoqKwqmqGofvChE-kSJykkBOQgbO1J3CUkFZjByjwWCuhIdufSmOofFwXBhhMoMoyinh0yfjg373pWzGRnW4H3IoNpZpU4mcHUUk+qYFjbkM-J6HoxgMr8yjjKOVEeAQYBYBAVjhspUbzupbQ+roFScsOPQdEMnLIZJ0H1HBCg9ECfycjJeL2T4OA4KiNCpAQIj8GIsBEAA6owAAy+VUOQ1D0EwrARu5ansbuRjZqYB5-HUEL0jyB4Jr0CjDKoKGemYcVXgQiXJfKqXpZl2WyN+YjBIEz7qEiYhKrAaUZWIJDDfCABUlWqWxDxlD5npNh0agbv0PKqG6NSjL8mE+vSkm4bZ+HxENSUpatE1EFNt4zeoc3BIty1fetm0eDt1aUmB+2lMCSjZruPpwZU8NKDyxgIw1do9Dooy3T6z0XrJ8LvSNUBjWtk3TbNGLA7MoMbUl23sNO0OsQ2ag5tBHJSXxkk5ioXZQayhjtOJu4ei6JYvSTCUfaNoPZbtMOc7dHWuiY4L46eDU8j0YzqG29QenxKgFg4AY4IIEBwDIY4EOz0aeQAtPxrR2tBG7dEorrHh0NnE-FCTzE7HnsXBGaYQKIzdHxrw9K8A3lrKqJh9VDx5gmoy6MKgx9EMUXo9uLpZjnPRNL767lzLQdXhWEDp7DCABQjnXnRX9Qno6rR8v84L9H8fq-IYHLJ3JCm-lATcNl3-KAq8LqgrdChGa0vQ+R67I6Dd-RguP1HyURqyQDPEHKKY5Qsvneg+u0xfrwFwl8fmkkdieB-2Y5zln55kXgkbc2tRc46G6j0ZCT99BjCihufstdAyvVJsNT640sq-xqrucokVBiVHupyeoEC3Q9iaLjQEQITBEwQXLdQBBcCUwmugg6UU3RRRQt0U68YhbGT6NmTuXVXgmG3p-AGQRGEWn+Fyc2vs+jslPAbUY+tTwx24r7So1dKEO3UKRU+oEObn19lfG0N9GjkIfs6X4yiGSS1xkyGWDggA
//    */
//   context: ({input}) => ({
//     ...input,
//     installManifests: [],
//     runScriptManifests: [],
//     abortController: new AbortController(),
//     scriptRunnerMachines: {},
//     ruleMachines: {},
//   }),
//   id: 'PkgManagerMachine',
//   initial: 'ready',
//   on: {
//     RUN_SCRIPTS: {
//       actions: [
//         {
//           type: 'assignRunScriptManifests',
//           params: ({event: {scripts}}) => scripts,
//         },
//       ],
//     },
//     HALT: {
//       target: '.cleanup',
//     },
//   },
//   states: {
//     ready: {
//       entry: [log('ready...')],
//       always: [
//         {
//           guard: {type: 'hasRunScriptManifests'},
//           target: 'runningScripts',
//         },
//       ],
//     },
//     runningScripts: {
//       entry: [
//         log(
//           ({context: {runScriptManifests}}) =>
//             `running ${runScriptManifests.length} scripts...`,
//         ),
//         {type: 'spawnScriptRunners'},
//       ],
//       on: {
//         WILL_RUN_SCRIPT: {
//           actions: [
//             log(
//               ({context, event}) =>
//                 `index: ${event.index}, pkgManagerIndex: ${context.index}`,
//             ),
//             {type: 'sendWillRunScriptEvent', params: ({event}) => event},
//           ],
//         },
//         'xstate.done.actor.scriptRunner.*': [
//           {
//             guard: {
//               type: 'machineErrored',
//               params: ({event: {output}}) => output,
//             },
//             actions: [
//               {type: 'stopScriptRunner', params: ({event: {output}}) => output},
//               {
//                 type: 'sendDidRunScriptErrorEvent',
//                 params: ({event}) =>
//                   event as {output: ScriptEvent.RunMachineOutputError},
//               },
//             ],
//           },
//           {
//             guard: {
//               type: 'scriptBailed',
//               params: ({event: {output}}) => output,
//             },
//             actions: [
//               {type: 'stopScriptRunner', params: ({event: {output}}) => output},
//               {
//                 type: 'sendDidRunScriptBailedEvent',
//                 params: ({event}) =>
//                   event as {output: ScriptEvent.RunMachineOutputBailed},
//               },
//             ],
//           },
//           {
//             guard: {
//               type: 'scriptCompleted',
//               params: ({event: {output}}) => output,
//             },
//             actions: [
//               {type: 'stopScriptRunner', params: ({event: {output}}) => output},
//               {
//                 type: 'sendDidRunScriptResultEvent',
//                 params: ({event}) =>
//                   event as {output: ScriptEvent.RunMachineOutputResult},
//               },
//             ],
//           },
//         ],
//       },
//       always: {
//         target: 'ready',
//         actions: {type: 'sendDidRunScriptsEvent'},
//         guard: {type: 'notHasScriptRunners'},
//       },
//     },
//     linting: {
//       entry: [{type: 'spawnRuleMachines'}],
//       always: [
//         {
//           guard: not('hasRuleMachines'),
//           target: 'ready',
//         },
//       ],
//       on: {
//         'xstate.done.actor.ruleMachine.*': [
//           {
//             actions: {
//               type: 'stopRuleMachine',
//               params: ({event: {output}}) => output,
//             },
//           },
//           {
//             guard: {
//               type: 'machineOk',
//               params: ({event: {output}}) => output,
//             },
//             actions: [
//               {
//                 type: 'assignLintResults',
//                 params: ({event: {output}}) => output,
//               },
//             ],
//           },
//           {
//             guard: {
//               type: 'machineErrored',
//               params: ({event: {output}}) => output,
//             },
//             actions: [
//               {
//                 type: 'assignError',
//                 params: ({event: {output}}) => {
//                   assertMachineOutputNotOk(output);
//                   return {
//                     error: output.error,
//                   };
//                 },
//               },
//             ],
//           },
//         ],
//         RULE_FAILED: {
//           actions: [
//             {
//               type: 'sendRuleFailed',
//               params: ({event}) => event,
//             },
//           ],
//         },
//         RULE_OK: {
//           actions: [
//             {
//               type: 'sendRuleOk',
//               params: ({event}) => event,
//             },
//           ],
//         },
//       },
//     },
//     cleanup: {
//       entry: [log('cleaning up...')],
//       invoke: {
//         src: 'teardownPkgManager',
//         input: ({context: {pkgManager}}) => pkgManager,
//         onDone: {
//           target: 'done',
//         },
//       },
//     },
//     done: {
//       entry: [log('pm done')],
//       type: 'final',
//     },
//     errored: {
//       entry: [log('errored!')],
//       type: 'final',
//     },
//   },
//   output: ({self: {id}, context: {error}}): PMMOutput =>
//     error ? {type: 'ERROR', error, id} : {type: 'OK', id},
// });
