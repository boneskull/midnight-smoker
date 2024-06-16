/**
 * Contains error codes for `SmokerError` instances
 *
 * @packageDocumentation
 */

/**
 * Mapping of known `BaseSmokerError` / `AggregateSmokerError` subclasses to
 * error codes.
 */
export const ErrorCodes = {
  AbortError: 'ESMOKER_ABORT',
  AggregatePackError: 'ESMOKER_AGGREGATEPACKERROR',
  CleanupError: 'ESMOKER_CLEANUP',
  ComponentCollisionError: 'ESMOKER_COMPONENTIDCOLLISION',
  DisallowedPluginError: 'ESMOKER_DISALLOWEDPLUGIN',
  DuplicatePluginError: 'ESMOKER_DUPLICATEPLUGIN',
  ExecError: 'ESMOKER_EXEC',
  InstallError: 'ESMOKER_INSTALL',
  InvalidArgError: 'ESMOKER_INVALIDARG',
  InvalidComponentError: 'ESMOKER_INVALIDCOMPONENT',
  InvalidPluginError: 'ESMOKER_INVALIDPLUGIN',
  LifecycleError: 'ESMOKER_LIFECYCLE',
  MachineError: 'ESMOKER_MACHINE',
  MissingPackageJsonError: 'ESMOKER_MISSINGPACKAGEJSON',
  NotImplementedError: 'ESMOKER_NOTIMPLEMENTED',
  PackageManagerError: 'ESMOKER_PACKAGEMANAGER',
  PackageManagerIdError: 'ESMOKER_PACKAGEMANAGERID',
  PackError: 'ESMOKER_PACK',
  PackParseError: 'ESMOKER_PACKPARSE',
  PluginConflictError: 'ESMOKER_PLUGINCONFLICT',
  PluginImportError: 'ESMOKER_PLUGINIMPORT',
  PluginInitError: 'ESMOKER_PLUGININIT',
  PluginResolutionError: 'ESMOKER_PLUGINRESOLUTION',
  ReporterError: 'ESMOKER_REPORTER',
  ReporterListenerError: 'ESMOKER_REPORTERLISTENER',
  RuleError: 'ESMOKER_RULEERROR',
  RunScriptError: 'ESMOKER_RUNSCRIPT',
  ScriptFailedError: 'ESMOKER_SCRIPTFAILED',
  SmokeError: 'ESMOKER_SMOKE',
  SmokerReferenceError: 'ESMOKER_REFERENCE',
  TempDirError: 'ESMOKER_DIRCREATION',
  UnknownDistTagError: 'ESMOKER_UNKNOWNDISTTAG',
  UnknownScriptError: 'ESMOKER_UNKNOWNSCRIPT',
  UnknownVersionError: 'ESMOKER_UNKNOWNVERSION',
  UnknownVersionRangeError: 'ESMOKER_UNKNOWNVERSIONRANGE',
  UnknownWorkspaceError: 'ESMOKER_UNKNOWNWORKSPACE',
  UnreadablePackageJsonError: 'ESMOKER_UNREADABLEPACKAGEJSON',
  UnresolvablePluginError: 'ESMOKER_PLUGINNOTFOUND',
  UnsupportedPackageManagerError: 'ESMOKER_UNSUPPORTEDPACKAGEMANAGER',
  PrivateWorkspaceError: 'ESMOKER_PRIVATEWORKSPACE',
  ZodValidationError: 'ESMOKER_VALIDATIONERROR',
} as const;

/**
 * Name of a known `BaseSmokerError` / `AggregateSmokerError` subclass
 */
export type SmokerErrorId = keyof typeof ErrorCodes;

/**
 * Error code for a known `BaseSmokerError` / `AggregateSmokerError` subclass
 */
export type SmokerErrorCode = (typeof ErrorCodes)[SmokerErrorId];
