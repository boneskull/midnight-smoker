import {type StaticPluginMetadata} from '#schema/static-plugin-metadata';
import {BaseSmokerError} from './base-error';

export type LifecycleStage = 'setup' | 'teardown';

export type LifecycleComponentKind = 'reporter' | 'pkg-manager';

export class LifecycleError extends BaseSmokerError<
  {
    name: string;
    stage: LifecycleStage;
    plugin: StaticPluginMetadata;
    kind: LifecycleComponentKind;
  },
  Error
> {
  public readonly id = 'LifecycleError';

  constructor(
    error: Error,
    stage: LifecycleStage,
    kind: LifecycleComponentKind,
    name: string,
    plugin: StaticPluginMetadata,
  ) {
    super(
      `Error during lifecycle hook "${stage}"`,
      {
        name,
        kind,
        stage,
        plugin,
      },
      error,
    );
  }
}
