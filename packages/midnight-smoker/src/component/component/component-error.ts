import {BaseSmokerError} from '../../error/base-error';
import type {ComponentKind} from './component-kind';

export class InvalidComponentError extends BaseSmokerError<{
  id: string;
  kind: ComponentKind;
}> {
  public readonly id = 'InvalidComponentError';
  constructor(message: string, kind: ComponentKind, id: string) {
    super(message, {id, kind});
  }
}
/**
 * @group Errors
 */
export class ComponentNameError extends BaseSmokerError<{
  componentName: string;
  pluginId: string;
}> {
  public readonly id = 'ComponentNameError';

  constructor(message: string, pluginId: string, componentName: string) {
    super(message, {pluginId, componentName});
  }
}
