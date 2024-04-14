import {type ScriptEvent} from '#event/event-constants';
import {RunScriptManifestSchema} from '#schema/run-script-manifest';
import {
  RunScriptResultSchema,
  ScriptResultErrorSchema,
  ScriptResultRawResultSchema,
} from '#schema/run-script-result';
import {StaticPkgManagerSpecSchema} from '#schema/static-pkg-manager-spec';
import {NonNegativeIntSchema} from '#util/schema-util';
import {z} from 'zod';
import {PkgManagerEventBaseSchema} from './pkg-manager-event';

export type PkgManagerRunScriptsBeginEventData = z.infer<
  typeof PkgManagerRunScriptsBeginEventDataSchema
>;
export type PkgManagerRunScriptsFailedEventData = z.infer<
  typeof PkgManagerRunScriptFailedEventDataSchema
>;
export type PkgManagerRunScriptsOkEventData = z.infer<
  typeof PkgManagerRunScriptsOkEventDataSchema
>;
export type RunScriptBeginEventData = z.infer<
  typeof RunScriptBeginEventDataSchema
>;
export type RunScriptFailedEventData = z.infer<
  typeof RunScriptFailedEventDataSchema
>;
export type RunScriptOkEventData = z.infer<typeof RunScriptOkEventDataSchema>;
export type RunScriptSkippedEventData = z.infer<
  typeof RunScriptSkippedEventDataSchema
>;
export type RunScriptsBeginEventData = RunScriptsEventData;
export type RunScriptsEndEventData = z.infer<
  typeof RunScriptsEndEventDataSchema
>;
export type RunScriptsEventData = z.infer<typeof RunScriptsEventDataSchema>;
export type RunScriptsFailedEventData = RunScriptsEndEventData;
export type RunScriptsOkEventData = RunScriptsEndEventData;
export type ScriptEventData = {
  [ScriptEvent.PkgManagerRunScriptsBegin]: PkgManagerRunScriptsBeginEventData;
  [ScriptEvent.PkgManagerRunScriptsFailed]: PkgManagerRunScriptsFailedEventData;
  [ScriptEvent.PkgManagerRunScriptsOk]: PkgManagerRunScriptsOkEventData;

  /**
   * Emitted once after the "checks" phase is complete (if enabled) and just
   * before custom scripts are about to run.
   *
   * @event
   */
  [ScriptEvent.RunScriptsBegin]: RunScriptsBeginEventData;

  /**
   * Emitted once after all custom scripts have run and at least one has failed.
   *
   * @event
   */
  [ScriptEvent.RunScriptsFailed]: RunScriptsFailedEventData;

  /**
   * Emitted once after all custom scripts have run and all were successful.
   *
   * @event
   */
  [ScriptEvent.RunScriptsOk]: RunScriptsOkEventData;

  /**
   * Emitted just before a custom script is about to be run in a package's temp
   * directory (post-{@link InstallOk})
   *
   * @event
   */
  [ScriptEvent.RunScriptBegin]: RunScriptBeginEventData;

  /**
   * Emitted whenever a custom script (run as in {@link RunScriptBegin}) exits
   * with a non-zero exit code.
   *
   * This is _not_ an unrecoverable error.
   *
   * @event
   */
  [ScriptEvent.RunScriptFailed]: RunScriptFailedEventData;

  /**
   * Emitted whenever a custom script runs successfully for a package.
   *
   * @event
   */
  [ScriptEvent.RunScriptOk]: RunScriptOkEventData;

  /**
   * Emitted if a script is skipped for a workspace (because it does not exist)
   *
   * @event
   */
  [ScriptEvent.RunScriptSkipped]: RunScriptSkippedEventData;
};

export const RunScriptsEventDataSchema = z.object({
  manifests: z
    .record(z.array(RunScriptManifestSchema))
    .describe(
      'Record of package manager specifiers to needed manifest for running custom scripts',
    ),
  totalUniqueScripts: NonNegativeIntSchema.describe(
    'Total number of unique scripts to run',
  ),
  totalUniquePkgs: NonNegativeIntSchema,
  totalPkgManagers: NonNegativeIntSchema,
});
export const RunScriptsEndEventDataSchema = RunScriptsEventDataSchema.extend({
  results: z
    .array(RunScriptResultSchema)
    .describe('List of RunScriptResult objects, one for each script run.'),
  failed: NonNegativeIntSchema.default(0).describe(
    'Count of scripts which failed',
  ),
  passed: NonNegativeIntSchema.default(0).describe(
    'Count of scripts which succeeded',
  ),
  skipped: NonNegativeIntSchema.default(0).describe(
    'Count of scripts which were skipped',
  ),
});
export const RunScriptEventDataSchema = RunScriptManifestSchema.extend({
  currentScript: NonNegativeIntSchema,
  totalUniqueScripts: NonNegativeIntSchema,
  pkgManager: StaticPkgManagerSpecSchema,
});
export const RunScriptBeginEventDataSchema = RunScriptEventDataSchema;
export const RunScriptOkEventDataSchema = RunScriptEventDataSchema.extend({
  rawResult: ScriptResultRawResultSchema,
});
export const RunScriptFailedEventDataSchema = RunScriptEventDataSchema.extend({
  error: ScriptResultErrorSchema,
});
export const RunScriptSkippedEventDataSchema = RunScriptEventDataSchema.extend({
  skipped: z.literal(true),
});
export const PkgManagerRunScriptsEventBaseDataSchema =
  PkgManagerEventBaseSchema.extend({
    manifests: z.array(RunScriptManifestSchema),
    totalUniqueScripts: NonNegativeIntSchema.describe(
      'Total number of scripts to run',
    ),
    totalUniquePkgs: NonNegativeIntSchema,
  });
export const PkgManagerRunScriptsBeginEventDataSchema =
  PkgManagerRunScriptsEventBaseDataSchema;
export const PkgManagerRunScriptsOkEventDataSchema =
  PkgManagerRunScriptsEventBaseDataSchema.extend({
    results: z.array(RunScriptResultSchema),
  });
export const PkgManagerRunScriptFailedEventDataSchema =
  PkgManagerRunScriptsOkEventDataSchema;
