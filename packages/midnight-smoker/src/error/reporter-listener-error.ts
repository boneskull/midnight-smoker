import {type SomeDataForEvent} from '#event/events';
import {type StaticPluginMetadata} from '#schema/static-plugin-metadata';
import {BaseSmokerError} from './base-error';

export class ReporterListenerError extends BaseSmokerError<
  {
    name: string;
    listener: string;
    event: SomeDataForEvent;
    plugin: StaticPluginMetadata;
  },
  Error
> {
  public readonly id = 'ReporterListenerError';

  constructor(
    error: Error,
    event: SomeDataForEvent,
    listener: string,
    name: string,
    plugin: StaticPluginMetadata,
  ) {
    super(
      `Error in listener "${listener}" in reporter "${name}" from plugin ${plugin.id} from event ${event.type}`,
      {
        name,
        listener,
        event,
        plugin,
      },
      error,
    );
  }
}
