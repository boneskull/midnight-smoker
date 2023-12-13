import {z} from 'zod';
import {zScriptError} from '../../error/error-schema';
import {customSchema, zAbortSignal, zNonEmptyString} from '../../schema-util';
import {
  zControllerRunScriptManifest,
  zRunScriptManifest,
  zRunScriptResult,
} from './pkg-manager-schema';

export const zRunScriptBeginNotifierParams = z.object({
  script: zNonEmptyString.describe('Name of the script to run'),
  pkgName: zNonEmptyString.describe(
    'Package name in which the script will run',
  ),
  total: z.number().optional().describe('Total number of scripts to run'),
  current: z
    .number()
    .optional()
    .describe(`This script's position in the total number of scripts`),
});

export const zRunScriptFailedEventData = zRunScriptBeginNotifierParams.setKey(
  'error',
  zScriptError.describe('Error describing the custom script failure'),
);

export const zScriptBeginNotifier = z
  .function(
    z.tuple([zRunScriptBeginNotifierParams] as [
      eventData: typeof zRunScriptBeginNotifierParams,
    ]),
    z.void(),
  )
  .describe(
    'A ScriptRunner implementation should call this when about to execute a script',
  );

export const zScriptOkNotifier = z
  .function(
    z.tuple([zRunScriptBeginNotifierParams] as [
      eventData: typeof zRunScriptBeginNotifierParams,
    ]),
    z.void(),
  )
  .describe(
    'A ScriptRunner implementation should call this when the script run succeeds',
  );

export const zScriptFailedNotifier = z
  .function(
    z.tuple([zRunScriptFailedEventData] as [
      eventData: typeof zRunScriptFailedEventData,
    ]),
    z.void(),
  )
  .describe(
    'A ScriptRunner implementation should call this when the script run fails',
  );

export interface ScriptRunnerNotifiers {
  scriptBegin: z.infer<typeof zScriptBeginNotifier>;
  scriptOk: z.infer<typeof zScriptOkNotifier>;
  scriptFailed: z.infer<typeof zScriptFailedNotifier>;
}

export const zScriptRunnerNotifiers = z.custom<ScriptRunnerNotifiers>();

export const zScriptRunnerOpts = customSchema<ScriptRunnerOpts>(
  z
    .object({
      bail: z
        .boolean()
        .optional()
        .describe('If true, abort on the first script failure'),
      signal: zAbortSignal,
    })
    .describe('Options for a ScriptRunner component'),
);

export interface ScriptRunnerOpts {
  bail?: boolean;
  signal: AbortSignal;
}
export const zRunScriptsEventData = z.object({
  manifest: z
    .record(z.array(zRunScriptManifest))
    .describe(
      'Record of package manager specifiers to needed manifest for running custom scripts',
    ),
  total: z
    .number()
    .int()
    .default(0)
    .describe(
      'Total number of scripts to run; <unique scripts> × <unique packages> × <package managers>',
    ),
});
export const zRunScriptsEndEventData = zRunScriptsEventData.extend({
  results: z
    .array(zRunScriptResult)
    .describe('List of RunScriptResult objects, one for each script run.'),
  failed: z.number().int().default(0).describe('Count of scripts which failed'),
  passed: z
    .number()
    .int()
    .default(0)
    .describe('Count of scripts that succeeded'),
});

export const zScriptRunner = z.function(
  z.tuple([
    zScriptRunnerNotifiers,
    zControllerRunScriptManifest,
    zScriptRunnerOpts,
  ] as [
    notifiers: typeof zScriptRunnerNotifiers,
    pkgManagerRunManifest: typeof zControllerRunScriptManifest,
    opts: typeof zScriptRunnerOpts,
  ]),
  z.promise(zRunScriptResult),
);
export type ScriptRunner = z.infer<typeof zScriptRunner>;
