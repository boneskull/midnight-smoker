import {type LoaderCapabilities} from '#capabilities';
import {ERROR, OK, TRANSIENT} from '#constants';
import {type DisallowedPluginError} from '#error/disallowed-plugin-error';
import {PluginImportError} from '#error/plugin-import-error';
import {PluginManifestError} from '#error/plugin-manifest-error';
import {PluginResolutionError} from '#error/plugin-resolution-error';
import {UnresolvablePluginError} from '#error/unresolvable-plugin-error';
import {asValidationError, type ValidationError} from '#error/validation-error';
import {type ActorOutputError, type ActorOutputOk} from '#machine/util';
import {PluginMetadata} from '#plugin/plugin-metadata';
import {type NormalizedPackageJson} from '#schema/package-json';
import {type Plugin, PluginSchema} from '#schema/plugin';
import {type FileManager} from '#util/filemanager';
import {isErrnoException} from '#util/guard/errno-exception';
import {mimport, resolveFrom} from '#util/importer';
import {type SomeUniqueId} from '#util/unique-id';
import path from 'node:path';
import {fromPromise} from 'xstate';

export type ResolvePluginLogicOutputOk = ActorOutputOk<{
  id: SomeUniqueId;
  metadata: Readonly<PluginMetadata>;
  plugin: Plugin;
}>;

export type ResolvePluginLogicOutputError = ActorOutputError<
  | DisallowedPluginError
  | PluginImportError
  | PluginManifestError
  | PluginResolutionError
  | UnresolvablePluginError
  | ValidationError,
  {id: SomeUniqueId}
>;

export type ResolvePluginLogicOutput =
  | ResolvePluginLogicOutputError
  | ResolvePluginLogicOutputOk;

export type ResolvePluginLogicInput = {
  fileManager: FileManager;
  id: SomeUniqueId;
  loader?: LoaderCapabilities;
} & (
  | {
      cwd: string;
      moduleId: string;
    }
  | {
      metadata: Readonly<PluginMetadata>;
      plugin?: Plugin;
    }
);

export const resolvePluginLogic = fromPromise<
  ResolvePluginLogicOutput,
  ResolvePluginLogicInput
>(
  async ({
    input: {
      fileManager,
      id,
      loader: {importer = mimport, resolve = resolveFrom} = {},
      ...input
    },
    self,
  }) => {
    const {id: actorId} = self;
    self.system._logger(`Spawned resolver with id ${actorId}`);
    try {
      let entryPoint: string;
      let metadata: Readonly<PluginMetadata>;
      if ('moduleId' in input) {
        const {cwd, moduleId} = input;
        const attemptedResolutions: string[] = [];

        const attemptResolve = (from: string) => {
          attemptedResolutions.push(from);
          try {
            return resolve(moduleId, from);
          } catch (err) {
            if (isErrnoException(err)) {
              if (err.code !== 'MODULE_NOT_FOUND') {
                throw new PluginResolutionError(err, moduleId, from);
              }
              return;
            }
            throw new PluginResolutionError(err, moduleId, from);
          }
        };

        let maybeEntryPoint = attemptResolve(cwd);

        if (!maybeEntryPoint && path.isAbsolute(moduleId)) {
          maybeEntryPoint = attemptResolve(__dirname);
        }

        if (!maybeEntryPoint) {
          throw new UnresolvablePluginError(moduleId, attemptedResolutions);
        }
        entryPoint = maybeEntryPoint;

        let pkgJson: NormalizedPackageJson;
        try {
          ({packageJson: pkgJson} = await fileManager.findPkgUp(
            path.dirname(entryPoint),
            {normalize: true, strict: true},
          ));
        } catch (err) {
          throw new PluginManifestError(
            moduleId,
            path.dirname(entryPoint),
            err,
          );
        }
        metadata = PluginMetadata.create({
          entryPoint,
          id: pkgJson.name,
          pkgJson,
          requestedAs: moduleId,
        });
      } else {
        metadata = input.metadata;
        entryPoint = metadata.entryPoint;
        if (metadata.entryPoint === TRANSIENT && !input.plugin) {
          throw new PluginImportError(
            new Error('Transient plugins cannot be resolved'),
            metadata,
          );
        }
      }

      let rawPlugin: unknown;
      let plugin: Plugin;
      try {
        rawPlugin = await importer(entryPoint);
      } catch (err) {
        throw new PluginImportError(err, metadata);
      }
      try {
        plugin = PluginSchema.parse(rawPlugin);
      } catch (err) {
        throw asValidationError(err);
      }

      return {actorId, id, metadata, plugin, type: OK};
    } catch (err) {
      return {
        actorId,
        error: err as ResolvePluginLogicOutputError['error'],
        id,
        type: ERROR,
      };
    }
  },
);
