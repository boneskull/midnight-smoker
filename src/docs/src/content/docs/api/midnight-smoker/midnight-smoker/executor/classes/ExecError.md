---
editUrl: false
next: false
prev: false
title: "ExecError"
---

This mainly just wraps an [ExecaError]([object Object]).

## Extends

- [`BaseSmokerError`](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/)\<`Object`, `ExecaError`\>

## Constructors

### new ExecError(error)

> **new ExecError**(`error`): [`ExecError`](/api/midnight-smoker/midnight-smoker/executor/classes/execerror/)

#### Parameters

• **error**: `ExecaError`\<`string`\>

#### Returns

[`ExecError`](/api/midnight-smoker/midnight-smoker/executor/classes/execerror/)

#### Overrides

[`midnight-smoker.midnight-smoker/errors.BaseSmokerError.constructor`](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/#constructors)

#### Source

[packages/midnight-smoker/src/component/executor/exec-error.ts:20](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/executor/exec-error.ts#L20)

## Properties

### all?

> **`readonly`** **all**?: `string`

#### Source

[packages/midnight-smoker/src/component/executor/exec-error.ts:14](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/executor/exec-error.ts#L14)

***

### cause?

> **`readonly`** **cause**?: `ExecaError`\<`string`\>

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

### command

> **`readonly`** **command**: `string`

#### Source

[packages/midnight-smoker/src/component/executor/exec-error.ts:12](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/executor/exec-error.ts#L12)

***

### context?

> **`readonly`** **context**?: `Object`

Arbitrary contextual data

#### Type declaration

##### command

> **command**: `string`

#### Inherited from

[`midnight-smoker.midnight-smoker/errors.BaseSmokerError.context`](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/#context)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:45](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L45)

***

### exitCode

> **`readonly`** **exitCode**: `number`

#### Source

[packages/midnight-smoker/src/component/executor/exec-error.ts:13](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/executor/exec-error.ts#L13)

***

### failed

> **`readonly`** **failed**: `boolean`

#### Source

[packages/midnight-smoker/src/component/executor/exec-error.ts:18](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/executor/exec-error.ts#L18)

***

### id

> **`readonly`** **id**: `"ExecError"` = `'ExecError'`

The name of the error.

Should _usually_ be the same as `this.constructor.name`

#### Overrides

[`midnight-smoker.midnight-smoker/errors.BaseSmokerError.id`](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/#abstract-id)

#### Source

[packages/midnight-smoker/src/component/executor/exec-error.ts:10](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/executor/exec-error.ts#L10)

***

### stderr

> **`readonly`** **stderr**: `string`

#### Source

[packages/midnight-smoker/src/component/executor/exec-error.ts:15](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/executor/exec-error.ts#L15)

***

### stdout

> **`readonly`** **stdout**: `string`

#### Source

[packages/midnight-smoker/src/component/executor/exec-error.ts:16](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/executor/exec-error.ts#L16)

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
> > **cause**: `undefined` \| `ExecaError`\<`string`\>
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
