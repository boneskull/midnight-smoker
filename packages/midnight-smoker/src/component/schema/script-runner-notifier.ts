import {
  ScriptEventBaseDataSchema,
  ScriptFailedEventDataSchema,
} from '#schema/script-runner-event';
import {z} from 'zod';

export const ScriptBeginNotifierSchema = z
  .function(
    z.tuple([ScriptEventBaseDataSchema] as [
      eventData: typeof ScriptEventBaseDataSchema,
    ]),
    z.void(),
  )
  .describe(
    'A ScriptRunner implementation should call this when about to execute a script',
  );

export const ScriptOkNotifierSchema = z
  .function(
    z.tuple([ScriptEventBaseDataSchema] as [
      eventData: typeof ScriptEventBaseDataSchema,
    ]),
    z.void(),
  )
  .describe(
    'A ScriptRunner implementation should call this when the script run succeeds',
  );

export const ScriptFailedNotifierSchema = z
  .function(
    z.tuple([ScriptFailedEventDataSchema] as [
      eventData: typeof ScriptFailedEventDataSchema,
    ]),
    z.void(),
  )
  .describe(
    'A ScriptRunner implementation should call this when the script run fails',
  );

export interface ScriptRunnerNotifiers {
  scriptBegin: z.infer<typeof ScriptBeginNotifierSchema>;
  scriptOk: z.infer<typeof ScriptOkNotifierSchema>;
  scriptFailed: z.infer<typeof ScriptFailedNotifierSchema>;
}

export const ScriptRunnerNotifiersSchema = z.custom<ScriptRunnerNotifiers>();
