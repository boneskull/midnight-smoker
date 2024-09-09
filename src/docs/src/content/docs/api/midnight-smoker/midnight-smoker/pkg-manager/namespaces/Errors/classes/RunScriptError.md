---
editUrl: false
next: false
prev: false
title: "RunScriptError"
---

Base class for all non-aggregate exceptions thrown by `midnight-smoker`.

## Extends

- [`BaseSmokerError`](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/)\<`Object`, [`ExecError`](/api/midnight-smoker/midnight-smoker/executor/classes/execerror/)\>

## Constructors

### new RunScriptError(error, script, pkgName, pkgManager)

> **new RunScriptError**(`error`, `script`, `pkgName`, `pkgManager`): [`RunScriptError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/runscripterror/)

#### Parameters

• **error**: [`ExecError`](/api/midnight-smoker/midnight-smoker/executor/classes/execerror/)

• **script**: `string`

• **pkgName**: `string`

• **pkgManager**: `string` \| [`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)

#### Returns

[`RunScriptError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/runscripterror/)

#### Overrides

[`midnight-smoker.midnight-smoker/errors.BaseSmokerError.constructor`](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/#constructors)

#### Source

[packages/midnight-smoker/src/component/pkg-manager/errors/run-script-error.ts:25](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/errors/run-script-error.ts#L25)

## Properties

### cause?

> **`readonly`** **cause**?: [`ExecError`](/api/midnight-smoker/midnight-smoker/executor/classes/execerror/)

#### Inherited from

[`midnight-smoker.midnight-smoker/errors.BaseSmokerError.cause`](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/#cause)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:46](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L46)

***

### code

> **`readonly`** **code**: [`SmokerErrorCode`](/api/midnight-smoker/midnight-smoker/errors/type-aliases/smokererrorcode/)

The error code.

#### Inherited from

[`midnight-smoker.midnight-smoker/errors.BaseSmokerError.code`](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/#code)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:41](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L41)

***

### context?

> **`readonly`** **context**?: `Object`

Arbitrary contextual data

#### Type declaration

##### command

> **command**: `string`

##### exitCode

> **exitCode**: `number`

##### output

> **output**: `string`

##### pkgManager

> **pkgManager**: `string`

##### pkgName

> **pkgName**: `string`

##### script

> **script**: `string`

#### Inherited from

[`midnight-smoker.midnight-smoker/errors.BaseSmokerError.context`](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/#context)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:45](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L45)

***

### id

> **`readonly`** **id**: `"RunScriptError"` = `'RunScriptError'`

The name of the error.

Should _usually_ be the same as `this.constructor.name`

#### Overrides

[`midnight-smoker.midnight-smoker/errors.BaseSmokerError.id`](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/#abstract-id)

#### Source

[packages/midnight-smoker/src/component/pkg-manager/errors/run-script-error.ts:23](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/errors/run-script-error.ts#L23)

## Methods

### format()

> **format**(`verbose`): `string`

Like `toString()`, except fancy.

#### Parameters

• **verbose**: `boolean`= `false`

If `true`, return more stuff.

#### Returns

`string`

#### Inherited from

[`midnight-smoker.midnight-smoker/errors.BaseSmokerError.format`](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/#format)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:52](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L52)

***

### toJSON()

> **toJSON**(): `Object`

Returns the error in a JSON-serializable format.

#### Returns

`Object`

> ##### cause
>
> > **cause**: `undefined` \| [`ExecError`](/api/midnight-smoker/midnight-smoker/executor/classes/execerror/)
>
> ##### code
>
> > **code**: [`SmokerErrorCode`](/api/midnight-smoker/midnight-smoker/errors/type-aliases/smokererrorcode/)
>
> ##### context
>
> > **context**: `undefined` \| `Object`
>
> ##### id
>
> > **id**: `"CleanupError"` \| `"ComponentNameError"` \| `"DirCreationError"` \| `"DisallowedPluginError"` \| `"DuplicatePluginError"` \| `"ExecError"` \| `"InstallError"` \| `"InvalidArgError"` \| `"InvalidComponentError"` \| `"InvalidPluginError"` \| `"MissingPackageJsonError"` \| `"NotImplementedError"` \| `"PackageManagerError"` \| `"PackageManagerIdError"` \| `"PackError"` \| `"PackParseError"` \| `"PluginConflictError"` \| `"PluginImportError"` \| `"PluginInitializationError"` \| `"PluginResolutionError"` \| `"ReporterError"` \| `"RuleError"` \| `"RunScriptError"` \| `"ScriptFailedError"` \| `"SmokeFailedError"` \| `"SmokerReferenceError"` \| `"UnknownDistTagError"` \| `"UnknownScriptError"` \| `"UnknownVersionError"` \| `"UnknownVersionRangeError"` \| `"UnreadablePackageJsonError"` \| `"UnresolvablePluginError"` \| `"UnsupportedPackageManagerError"` \| `"ZodValidationError"`
>
> ##### message
>
> > **message**: `string`
>
> ##### stack
>
> > **stack**: `undefined` \| `string`
>

#### Inherited from

[`midnight-smoker.midnight-smoker/errors.BaseSmokerError.toJSON`](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/#tojson)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:73](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L73)
