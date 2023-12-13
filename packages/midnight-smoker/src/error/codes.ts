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
  CleanupError: 'ESMOKER_CLEANUP',
  ComponentNameError: 'ESMOKER_COMPONENTNAME',
  DirCreationError: 'ESMOKER_DIRCREATION',
  DisallowedPluginError: 'ESMOKER_DISALLOWEDPLUGIN',
  DuplicatePluginError: 'ESMOKER_DUPLICATEPLUGIN',
  ExecError: 'ESMOKER_EXEC',
  InstallError: 'ESMOKER_INSTALL',
  InvalidArgError: 'ESMOKER_INVALIDARG',
  InvalidComponentError: 'ESMOKER_INVALIDCOMPONENT',
  InvalidPluginError: 'ESMOKER_INVALIDPLUGIN',
  MissingPackageJsonError: 'ESMOKER_MISSINGPACKAGEJSON',
  NotImplementedError: 'ESMOKER_NOTIMPLEMENTED',
  PackageManagerError: 'ESMOKER_PACKAGEMANAGER',
  PackageManagerIdError: 'ESMOKER_PACKAGEMANAGERID',
  PackError: 'ESMOKER_PACK',
  PackParseError: 'ESMOKER_PACKPARSE',
  PluginConflictError: 'ESMOKER_PLUGINCONFLICT',
  PluginImportError: 'ESMOKER_PLUGINIMPORT',
  PluginInitializationError: 'ESMOKER_PLUGININIT',
  PluginResolutionError: 'ESMOKER_PLUGINRESOLUTION',
  ReporterError: 'ESMOKER_REPORTER',
  RuleError: 'ESMOKER_RULEERROR',
  RunScriptError: 'ESMOKER_RUNSCRIPT',
  ScriptFailedError: 'ESMOKER_SCRIPTFAILED',
  SmokeFailedError: 'ESMOKER_SMOKEFAILED',
  SmokerReferenceError: 'ESMOKER_REFERENCE',
  UnknownDistTagError: 'ESMOKER_UNKNOWNDISTTAG',
  UnknownScriptError: 'ESMOKER_UNKNOWNSCRIPT',
  UnknownVersionError: 'ESMOKER_UNKNOWNVERSION',
  UnknownVersionRangeError: 'ESMOKER_UNKNOWNVERSIONRANGE',
  UnreadablePackageJsonError: 'ESMOKER_UNREADABLEPACKAGEJSON',
  UnresolvablePluginError: 'ESMOKER_PLUGINNOTFOUND',
  UnsupportedPackageManagerError: 'ESMOKER_UNSUPPORTEDPACKAGEMANAGER',
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
