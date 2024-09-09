import {BaseSmokerError} from './base-error.js';

/**
 * @group Errors
 */

export class ComponentCollisionError extends BaseSmokerError<{
  componentName: string;
  pluginId: string;
}> {
  public readonly name = 'ComponentCollisionError';

  constructor(message: string, pluginId: string, componentName: string) {
    super(message, {componentName, pluginId});
  }
}
