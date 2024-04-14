// import {SmokerEvent} from '#event';
// import {ok} from 'assert/strict';
// import {emit, setup} from 'xstate';
// import type * as Event from '../controller/control-machine-events';

// export const BridgeMachine = setup({
//   types: {
//     emitted: {} as Event.CtrlEmitted,
//   },
//   actions: {
//     emit: emit(<T extends Event.CtrlEmitted>({context}, event: T) => {
//       return event;
//     }),

//     emitRuleFailed: emit(
//       (
//         {context: {pkgManagers, rules}},
//         event: Event.CtrlRuleFailedEvent,
//       ): Event.CtrlExternalEvent<'RuleFailed'> => {
//         const total = pkgManagers.length * rules.length;
//         const {
//           rule: {name: rule},
//           issues: failed,
//           ...rest
//         } = event;
//         return {
//           ...rest,
//           type: SmokerEvent.RuleFailed,
//           rule,
//           total,
//           failed,
//         };
//       },
//     ),
//     emitRuleOk: emit(
//       (
//         {context: {pkgManagers, rules}},
//         event: Event.CtrlRuleOkEvent,
//       ): Event.CtrlExternalEvent<'RuleOk'> => {
//         const total = pkgManagers.length * rules.length;
//         const {
//           rule: {name: rule},
//           ...rest
//         } = event;
//         return {
//           ...rest,
//           type: SmokerEvent.RuleOk,
//           rule,
//           total,
//         };
//       },
//     ),
//     emitLintBegin: emit(
//       ({
//         context: {
//           smokerOptions: {rules: config},
//           rules: {length: total},
//           pkgManagers: {length: pkgManagerCount},
//         },
//       }): Event.CtrlExternalEvent<'LintBegin'> => {
//         return {
//           type: SmokerEvent.LintBegin,
//           config,
//           total,
//           totalChecks: pkgManagerCount * total,
//         };
//       },
//     ),
//     emitSmokeBegin: emit(
//       ({
//         context: {pluginRegistry, smokerOptions},
//       }): Event.CtrlExternalEvent<'SmokeBegin'> => {
//         const plugins = pluginRegistry.plugins.map((plugin) => plugin.toJSON());
//         return {
//           type: SmokerEvent.SmokeBegin,
//           plugins,
//           opts: smokerOptions,
//         };
//       },
//     ),
//     emitRunScriptBegin: emit(
//       (
//         {context: {totalScripts}},
//         {
//           runScriptManifest,
//           scriptIndex,
//           pkgManagerIndex,
//         }: Event.CtrlRunScriptBeginEvent,
//       ): Event.CtrlExternalEvent<'RunScriptBegin'> => ({
//         type: SmokerEvent.RunScriptBegin,
//         currentPkgManager: scriptIndex * pkgManagerIndex,
//         totalUniqueScripts: totalScripts,
//         ...runScriptManifest,
//       }),
//     ),
//     emitRunScriptsBegin: emit(
//       ({
//         context: {
//           runScriptManifestsByPkgManager: manifest,
//           totalScripts: total,
//         },
//       }): Event.CtrlExternalEvent<'RunScriptsBegin'> => {
//         ok(manifest, 'No runScriptManifestsByPkgManager. This is a bug');
//         ok(total, 'No total scripts count. This is a bug');
//         return {
//           type: SmokerEvent.RunScriptsBegin,
//           manifest,
//           totalUniqueScripts: total,
//         };
//       },
//     ),
//     emitScriptSkipped: emit(
//       (
//         {context: {totalScripts}},
//         {output: {manifest}}: {output: SRMOutputResult},
//       ): Event.CtrlExternalEvent<'RunScriptSkipped'> => ({
//         type: SmokerEvent.RunScriptSkipped,
//         ...manifest,
//         totalUniqueScripts: totalScripts,
//         currentPkgManager: 0,
//         skipped: true,
//       }),
//     ),
//     emitRunScriptFailed: emit(
//       (
//         {context: {totalScripts}},
//         {output: {result, manifest}}: {output: SRMOutputResult},
//       ): Event.CtrlExternalEvent<'RunScriptFailed'> => ({
//         type: SmokerEvent.RunScriptFailed,
//         ...manifest,
//         totalUniqueScripts: totalScripts,
//         currentPkgManager: 0,
//         error: result.error!,
//       }),
//     ),
//     emitRunScriptOk: emit(
//       (
//         {context: {totalScripts}},
//         {output: {result, manifest}}: {output: SRMOutputResult},
//       ): Event.CtrlExternalEvent<'RunScriptOk'> => ({
//         type: SmokerEvent.RunScriptOk,
//         ...manifest,
//         totalUniqueScripts: totalScripts,
//         currentPkgManager: 0,
//         rawResult: result.rawResult!,
//       }),
//     ),
//     emitRunScriptsEnd: emit(
//       ({
//         context: {
//           runScriptResults,
//           totalScripts: total,
//           runScriptManifestsByPkgManager,
//         },
//       }):
//         | Event.CtrlExternalEvent<'RunScriptsFailed'>
//         | Event.CtrlExternalEvent<'RunScriptsOk'> => {
//         ok(runScriptResults?.length, 'No scripts were run. This is a bug');
//         ok(total, 'No total scripts count. This is a bug');
//         ok(
//           runScriptManifestsByPkgManager,
//           'No runScriptManifestsByPkgManager. This is a bug',
//         );

//         const [failedResults, otherResults] = partition(
//           runScriptResults,
//           'error',
//         );
//         const failed = failedResults.length;
//         const [skippedResults, passedResults] = partition(otherResults, {
//           skipped: true,
//         });
//         const passed = passedResults.length;
//         const skipped = skippedResults.length;

//         const type = failed
//           ? SmokerEvent.RunScriptsFailed
//           : SmokerEvent.RunScriptsOk;

//         return {
//           manifest: runScriptManifestsByPkgManager,
//           type,
//           results: runScriptResults,
//           failed,
//           passed,
//           skipped,
//           totalUniqueScripts: total,
//         };
//       },
//     ),
//     emitBeforeExit: emit({type: SmokerEvent.BeforeExit}),
//   },
// });
