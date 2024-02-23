import type {ComponentKind} from '#constants';
import {BaseSmokerError} from './base-error';

export class InvalidComponentError extends BaseSmokerError<{
  id: string;
  kind: ComponentKind;
}> {
  public readonly id = 'InvalidComponentError';
  constructor(message: string, kind: ComponentKind, id: string) {
    super(message, {id, kind});
  }
}
