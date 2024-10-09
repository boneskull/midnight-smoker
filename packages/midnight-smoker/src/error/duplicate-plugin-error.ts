/**
 * Errors thrown by the `PluginRegistry`.
 *
 * These should all be considered "internal" and should not be thrown nor caught
 * by plugins.
 *
 * @packageDocumentation
 * @internal
 */

import {BaseSmokerError} from '#error/base-error';

/**
 * Thrown when a `PluginObject` is already registered under a different name.
 *
 * @group Errors
 * @internal
 */
export class DuplicatePluginError extends BaseSmokerError<{
  existingId: string;
  incomingId: string;
}> {
  public readonly name = 'DuplicatePluginError';

  constructor(existingId: string, incomingId: string) {
    super(
      `Plugin ${incomingId} is a duplicate of already-registered ${existingId}`,
      {existingId, incomingId},
    );
  }
}
