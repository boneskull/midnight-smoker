import {PkgManagerSchema} from '#schema/pkg-manager';
import {zRunScriptResult} from '#schema/run-script-result';
import {ScriptRunnerNotifiersSchema} from '#schema/script-runner-notifier';
import {ScriptRunnerOptsSchema} from '#schema/script-runner-opts';
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
