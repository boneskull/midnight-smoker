/**
 * Errors thrown by the `PluginRegistry`.
 *
 * These should all be considered "internal" and should not be thrown nor caught
 * by plugins.
 *
 * @packageDocumentation
 * @internal
 */

import {cyanBright, italic} from 'chalk';
import {PluginMetadata} from '../plugin/metadata';
import {PluginObject} from '../plugin/plugin';
import {BaseSmokerError} from './base-error';

/**
 * Represents an error that occurs when an loading invalid plugin is attempted.
 *
 * @group Errors
 * @internal
 */
export class InvalidPluginError extends BaseSmokerError<
  {
    metadata: PluginMetadata;
    rawPlugin?: unknown;
  },
  Error
> {
  public readonly id = 'InvalidPluginError';

  constructor(error: Error, metadata: PluginMetadata, rawPlugin?: unknown) {
    super(
      `Alleged plugin at ${metadata.entryPoint} is invalid`,
      {
        metadata,
        rawPlugin,
      },
      error,
    );
  }
}

/**
 * Thrown when a plugin is disallowed by the registry.
 *
 * @group Errors
 * @internal
 */
export class DisallowedPluginError extends BaseSmokerError<{
  metadata?: PluginMetadata;
}> {
  public readonly id = 'DisallowedPluginError';

  constructor(metadata?: PluginMetadata) {
    super(
      metadata
        ? `Plugin ${metadata.id} from ${metadata.entryPoint} disallowed`
        : 'Plugin registration closed',
      {
        metadata,
      },
    );
  }
}

/**
 * Thrown when a plugin fails to initialize--when its `PluginFactory` throws or
 * rejects.
 *
 * @group Errors
 * @internal
 */
export class PluginInitializationError extends BaseSmokerError<
  {
    metadata: PluginMetadata;
    plugin: PluginObject;
  },
  Error
> {
  public readonly id = 'PluginInitializationError';

  constructor(error: Error, metadata: PluginMetadata, plugin: PluginObject) {
    super(
      `Plugin ${metadata} failed to initialize`,
      {
        metadata,
        plugin,
      },
      error,
    );
  }
}

export class PluginImportError extends BaseSmokerError<
  {
    metadata: PluginMetadata;
  },
  Error
> {
  public readonly id = 'PluginImportError';

  constructor(error: Error, metadata: PluginMetadata) {
    super(
      `Plugin ${metadata} failed to import`,
      {
        metadata,
      },
      error,
    );
  }
}

/**
 * Thrown when a plugin fails to load and the reason is not because it could not
 * be found.
 *
 * @group Errors
 */
export class PluginResolutionError extends BaseSmokerError<
  {
    pluginSpecifier: string;
    cwd: string;
  },
  Error
> {
  public readonly id = 'PluginResolutionError';

  constructor(error: Error, pluginSpecifier: string, cwd: string) {
    super(
      `Could not resolve plugin ${cyanBright(pluginSpecifier)}`,
      {
        pluginSpecifier,
        cwd,
      },
      error,
    );
  }
}

/**
 * Thrown when a plugin fails to load because it could not be found.
 *
 * @group Errors
 */
export class UnresolvablePluginError extends BaseSmokerError<{
  pluginSpecifier: string;
  attemptedResolutionFrom: string[];
}> {
  public readonly id = 'UnresolvablePluginError';

  constructor(pluginSpecifier: string, attemptedResolutionFrom: string[]) {
    super(
      `Could not resolve plugin ${cyanBright(pluginSpecifier)}. ${italic(
        'Where could it be??',
      )}`,
      {
        pluginSpecifier,
        attemptedResolutionFrom,
      },
    );
  }
}

/**
 * Thrown when a plugin is registered with a name that is already taken.
 *
 * @group Errors
 * @internal
 */
export class PluginConflictError extends BaseSmokerError<{
  pluginId: string;
  existing: PluginMetadata;
  incoming: PluginMetadata;
}> {
  public readonly id = 'PluginConflictError';

  constructor(existing: PluginMetadata, incoming: PluginMetadata) {
    super(
      `Plugin ${existing.id} from ${incoming.entryPoint} conflicts with ${existing.entryPoint}`,
      {pluginId: existing.id, existing, incoming},
    );
  }
}

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
  public readonly id = 'DuplicatePluginError';

  constructor(existingId: string, incomingId: string) {
    super(
      `Plugin ${incomingId} is a duplicate of already-registered ${existingId}`,
      {existingId, incomingId},
    );
  }
}
