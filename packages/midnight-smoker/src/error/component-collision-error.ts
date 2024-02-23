import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */

export class ComponentCollisionError extends BaseSmokerError<{
  componentName: string;
  pluginId: string;
}> {
  public readonly id = 'ComponentCollisionError';

  constructor(message: string, pluginId: string, componentName: string) {
    super(message, {pluginId, componentName});
  }
}
