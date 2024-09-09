---
editUrl: false
next: false
prev: false
title: "ErrorCodes"
---

> **`const`** **ErrorCodes**: `Object`

Mapping of known `BaseSmokerError` / `AggregateSmokerError` subclasses to
error codes.

## Type declaration

### CleanupError

> **`readonly`** **CleanupError**: `"ESMOKER_CLEANUP"` = `'ESMOKER_CLEANUP'`

### ComponentNameError

> **`readonly`** **ComponentNameError**: `"ESMOKER_COMPONENTNAME"` = `'ESMOKER_COMPONENTNAME'`

### DirCreationError

> **`readonly`** **DirCreationError**: `"ESMOKER_DIRCREATION"` = `'ESMOKER_DIRCREATION'`

### DisallowedPluginError

> **`readonly`** **DisallowedPluginError**: `"ESMOKER_DISALLOWEDPLUGIN"` = `'ESMOKER_DISALLOWEDPLUGIN'`

### DuplicatePluginError

> **`readonly`** **DuplicatePluginError**: `"ESMOKER_DUPLICATEPLUGIN"` = `'ESMOKER_DUPLICATEPLUGIN'`

### ExecError

> **`readonly`** **ExecError**: `"ESMOKER_EXEC"` = `'ESMOKER_EXEC'`

### InstallError

> **`readonly`** **InstallError**: `"ESMOKER_INSTALL"` = `'ESMOKER_INSTALL'`

### InvalidArgError

> **`readonly`** **InvalidArgError**: `"ESMOKER_INVALIDARG"` = `'ESMOKER_INVALIDARG'`

### InvalidComponentError

> **`readonly`** **InvalidComponentError**: `"ESMOKER_INVALIDCOMPONENT"` = `'ESMOKER_INVALIDCOMPONENT'`

### InvalidPluginError

> **`readonly`** **InvalidPluginError**: `"ESMOKER_INVALIDPLUGIN"` = `'ESMOKER_INVALIDPLUGIN'`

### MissingPackageJsonError

> **`readonly`** **MissingPackageJsonError**: `"ESMOKER_MISSINGPACKAGEJSON"` = `'ESMOKER_MISSINGPACKAGEJSON'`

### NotImplementedError

> **`readonly`** **NotImplementedError**: `"ESMOKER_NOTIMPLEMENTED"` = `'ESMOKER_NOTIMPLEMENTED'`

### PackError

> **`readonly`** **PackError**: `"ESMOKER_PACK"` = `'ESMOKER_PACK'`

### PackParseError

> **`readonly`** **PackParseError**: `"ESMOKER_PACKPARSE"` = `'ESMOKER_PACKPARSE'`

### PackageManagerError

> **`readonly`** **PackageManagerError**: `"ESMOKER_PACKAGEMANAGER"` = `'ESMOKER_PACKAGEMANAGER'`

### PackageManagerIdError

> **`readonly`** **PackageManagerIdError**: `"ESMOKER_PACKAGEMANAGERID"` = `'ESMOKER_PACKAGEMANAGERID'`

### PluginConflictError

> **`readonly`** **PluginConflictError**: `"ESMOKER_PLUGINCONFLICT"` = `'ESMOKER_PLUGINCONFLICT'`

### PluginImportError

> **`readonly`** **PluginImportError**: `"ESMOKER_PLUGINIMPORT"` = `'ESMOKER_PLUGINIMPORT'`

### PluginInitializationError

> **`readonly`** **PluginInitializationError**: `"ESMOKER_PLUGININIT"` = `'ESMOKER_PLUGININIT'`

### PluginResolutionError

> **`readonly`** **PluginResolutionError**: `"ESMOKER_PLUGINRESOLUTION"` = `'ESMOKER_PLUGINRESOLUTION'`

### ReporterError

> **`readonly`** **ReporterError**: `"ESMOKER_REPORTER"` = `'ESMOKER_REPORTER'`

### RuleError

> **`readonly`** **RuleError**: `"ESMOKER_RULEERROR"` = `'ESMOKER_RULEERROR'`

### RunScriptError

> **`readonly`** **RunScriptError**: `"ESMOKER_RUNSCRIPT"` = `'ESMOKER_RUNSCRIPT'`

### ScriptFailedError

> **`readonly`** **ScriptFailedError**: `"ESMOKER_SCRIPTFAILED"` = `'ESMOKER_SCRIPTFAILED'`

### SmokeFailedError

> **`readonly`** **SmokeFailedError**: `"ESMOKER_SMOKEFAILED"` = `'ESMOKER_SMOKEFAILED'`

### SmokerReferenceError

> **`readonly`** **SmokerReferenceError**: `"ESMOKER_REFERENCE"` = `'ESMOKER_REFERENCE'`

### UnknownDistTagError

> **`readonly`** **UnknownDistTagError**: `"ESMOKER_UNKNOWNDISTTAG"` = `'ESMOKER_UNKNOWNDISTTAG'`

### UnknownScriptError

> **`readonly`** **UnknownScriptError**: `"ESMOKER_UNKNOWNSCRIPT"` = `'ESMOKER_UNKNOWNSCRIPT'`

### UnknownVersionError

> **`readonly`** **UnknownVersionError**: `"ESMOKER_UNKNOWNVERSION"` = `'ESMOKER_UNKNOWNVERSION'`

### UnknownVersionRangeError

> **`readonly`** **UnknownVersionRangeError**: `"ESMOKER_UNKNOWNVERSIONRANGE"` = `'ESMOKER_UNKNOWNVERSIONRANGE'`

### UnreadablePackageJsonError

> **`readonly`** **UnreadablePackageJsonError**: `"ESMOKER_UNREADABLEPACKAGEJSON"` = `'ESMOKER_UNREADABLEPACKAGEJSON'`

### UnresolvablePluginError

> **`readonly`** **UnresolvablePluginError**: `"ESMOKER_PLUGINNOTFOUND"` = `'ESMOKER_PLUGINNOTFOUND'`

### UnsupportedPackageManagerError

> **`readonly`** **UnsupportedPackageManagerError**: `"ESMOKER_UNSUPPORTEDPACKAGEMANAGER"` = `'ESMOKER_UNSUPPORTEDPACKAGEMANAGER'`

### ZodValidationError

> **`readonly`** **ZodValidationError**: `"ESMOKER_VALIDATIONERROR"` = `'ESMOKER_VALIDATIONERROR'`

## Source

[packages/midnight-smoker/src/error/codes.ts:11](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/codes.ts#L11)
