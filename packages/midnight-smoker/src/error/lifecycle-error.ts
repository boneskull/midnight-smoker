import {type StaticPluginMetadata} from '#defs/plugin';
import {BaseSmokerError} from '#error/base-error';
import {fromUnknownError} from '#util/from-unknown-error';

export type LifecycleStage = 'setup' | 'teardown';

export type LifecycleComponentKind = 'pkg-manager' | 'reporter';

export class LifecycleError extends BaseSmokerError<
  {
    kind: LifecycleComponentKind;
    name: string;
    plugin: StaticPluginMetadata;
    stage: LifecycleStage;
  },
  Error
> {
  public readonly name = 'LifecycleError';

  constructor(
    error: unknown,
    stage: LifecycleStage,
    kind: LifecycleComponentKind,
    name: string,
    plugin: StaticPluginMetadata,
  ) {
    super(
      `Error during lifecycle hook "${stage}"`,
      {
        kind,
        name,
        plugin,
        stage,
      },
      fromUnknownError(error),
    );
  }
}
