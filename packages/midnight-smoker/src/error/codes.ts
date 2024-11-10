/**
 * Contains error codes for `SmokerError` instances
 *
 * @packageDocumentation
 */

import {constant} from '#constants/create-constant';

/**
 * Mapping of known `BaseSmokerError` / `AggregateSmokerError` subclasses to
 * error codes.
 */
export const ErrorCode = constant({
  AbortError: 'ESMOKER_ABORT',
  AggregatePackError: 'ESMOKER_AGGREGATEPACKERROR',
  AssertionError: 'ESMOKER_ASSERTION',
  CleanupError: 'ESMOKER_CLEANUP',
  ComponentCollisionError: 'ESMOKER_COMPONENTIDCOLLISION',
  DisallowedPluginError: 'ESMOKER_DISALLOWEDPLUGIN',
  DuplicatePluginError: 'ESMOKER_DUPLICATEPLUGIN',
  ExecError: 'ESMOKER_EXEC',
  InstallError: 'ESMOKER_INSTALL',
  InvalidArgError: 'ESMOKER_INVALIDARG',
  InvalidPkgJsonError: 'ESMOKER_INVALIDPACKAGEJSON',
  LifecycleError: 'ESMOKER_LIFECYCLE',
  MachineError: 'ESMOKER_MACHINE',
  MissingPackageJsonError: 'ESMOKER_MISSINGPACKAGEJSON',
  NotImplementedError: 'ESMOKER_NOTIMPLEMENTED',
  PackageManagerIdError: 'ESMOKER_PACKAGEMANAGERID',
  PackError: 'ESMOKER_PACK',
  PackParseError: 'ESMOKER_PACKPARSE',
  PluginConflictError: 'ESMOKER_PLUGINCONFLICT',
  PluginImportError: 'ESMOKER_PLUGINIMPORT',
  PluginInitError: 'ESMOKER_PLUGININIT',
  PluginManifestError: 'ESMOKER_PLUGINMANIFEST',
  PluginResolutionError: 'ESMOKER_PLUGINRESOLUTION',
  PrivateWorkspaceError: 'ESMOKER_PRIVATEWORKSPACE',
  ReporterError: 'ESMOKER_REPORTER',
  RuleError: 'ESMOKER_RULEERROR',
  RunScriptError: 'ESMOKER_RUNSCRIPT',
  ScriptFailedError: 'ESMOKER_SCRIPTFAILED',
  SmokeError: 'ESMOKER_SMOKE',
  SmokerReferenceError: 'ESMOKER_REFERENCE',
  SpawnError: 'ESMOKER_SPAWN',
  TempDirError: 'ESMOKER_DIRCREATION',
  UnknownComponentError: 'ESMOKER_UNKNOWNCOMPONENT',
  UnknownError: 'ESMOKER_UNKNOWN',
  UnknownScriptError: 'ESMOKER_UNKNOWNSCRIPT',
  UnreadablePackageJsonError: 'ESMOKER_UNREADABLEPACKAGEJSON',
  UnresolvablePluginError: 'ESMOKER_PLUGINNOTFOUND',
  UnsupportedPackageManagerError: 'ESMOKER_UNSUPPORTEDPACKAGEMANAGER',
  ZodValidationError: 'ESMOKER_VALIDATIONERROR',
});

/**
 * Name of a known `BaseSmokerError` / `AggregateSmokerError` subclass
 */
export type SmokerErrorName = keyof typeof ErrorCode;

/**
 * Error code for a known `BaseSmokerError` / `AggregateSmokerError` subclass
 */
export type SmokerErrorCode = (typeof ErrorCode)[SmokerErrorName];
