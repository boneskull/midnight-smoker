import {type StaticPluginMetadata} from '#plugin/static-plugin-metadata';
import {fromUnknownError} from '#util/error-util';

import {BaseSmokerError} from './base-error';

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
