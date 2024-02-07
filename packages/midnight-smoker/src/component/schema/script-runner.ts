import {PkgManagerSchema} from '#schema/pkg-manager.js';
import {zRunScriptResult} from '#schema/run-script-result.js';
import {ScriptRunnerNotifiersSchema} from '#schema/script-runner-notifier.js';
import {ScriptRunnerOptsSchema} from '#schema/script-runner-opts.js';
import {z} from 'zod';
import {RunScriptManifestSchema} from './run-script-manifest';

export const ScriptRunnerSchema = z.function(
  z.tuple([
    ScriptRunnerNotifiersSchema,
    RunScriptManifestSchema,
    PkgManagerSchema,
    ScriptRunnerOptsSchema,
  ] as [
    notifiers: typeof ScriptRunnerNotifiersSchema,
    manifest: typeof RunScriptManifestSchema,
    pkgManager: typeof PkgManagerSchema,
    opts: typeof ScriptRunnerOptsSchema,
  ]),
  z.promise(zRunScriptResult),
);
export type ScriptRunner = z.infer<typeof ScriptRunnerSchema>;
