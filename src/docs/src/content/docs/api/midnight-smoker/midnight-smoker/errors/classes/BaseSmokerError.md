---
editUrl: false
next: false
prev: false
title: "BaseSmokerError"
---

Base class for all non-aggregate exceptions thrown by `midnight-smoker`.

## Extends

- [`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error )

## Type parameters

• **Context** extends `object` \| `void` = `void`

Arbitrary per-exception-class data to attach to the
  error.

• **Cause** extends [`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error ) \| `void` = `void`

Any caught exception that caused this error to be
  instantiated & thrown.

## Implements

- [`SmokerError`](/api/midnight-smoker/midnight-smoker/errors/interfaces/smokererror/)\<`Context`, `Cause`\>

## Constructors

### new BaseSmokerError(message, context, cause)

> **new BaseSmokerError**\<`Context`, `Cause`\>(`message`, `context`?, `cause`?): [`BaseSmokerError`](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/)\<`Context`, `Cause`\>

#### Parameters

• **message**: `string`

• **context?**: `Context`

• **cause?**: `Cause`

#### Returns

[`BaseSmokerError`](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/)\<`Context`, `Cause`\>

#### Overrides

`Error.constructor`

#### Source

[packages/midnight-smoker/src/error/base-error.ts:43](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L43)

## Properties

### cause?

> **`readonly`** **cause**?: `Cause`

#### Implementation of

[`midnight-smoker.midnight-smoker/errors.SmokerError.cause`](/api/midnight-smoker/midnight-smoker/errors/interfaces/smokererror/#cause)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:46](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L46)

***

### code

> **`readonly`** **code**: [`SmokerErrorCode`](/api/midnight-smoker/midnight-smoker/errors/type-aliases/smokererrorcode/)

The error code.

#### Implementation of

[`midnight-smoker.midnight-smoker/errors.SmokerError.code`](/api/midnight-smoker/midnight-smoker/errors/interfaces/smokererror/#code)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:41](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L41)

***

### context?

> **`readonly`** **context**?: `Context`

Arbitrary contextual data

#### Implementation of

[`midnight-smoker.midnight-smoker/errors.SmokerError.context`](/api/midnight-smoker/midnight-smoker/errors/interfaces/smokererror/#context)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:45](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L45)

***

### `abstract` id

> **`abstract`** **`readonly`** **id**: `"CleanupError"` \| `"ComponentNameError"` \| `"DirCreationError"` \| `"DisallowedPluginError"` \| `"DuplicatePluginError"` \| `"ExecError"` \| `"InstallError"` \| `"InvalidArgError"` \| `"InvalidComponentError"` \| `"InvalidPluginError"` \| `"MissingPackageJsonError"` \| `"NotImplementedError"` \| `"PackageManagerError"` \| `"PackageManagerIdError"` \| `"PackError"` \| `"PackParseError"` \| `"PluginConflictError"` \| `"PluginImportError"` \| `"PluginInitializationError"` \| `"PluginResolutionError"` \| `"ReporterError"` \| `"RuleError"` \| `"RunScriptError"` \| `"ScriptFailedError"` \| `"SmokeFailedError"` \| `"SmokerReferenceError"` \| `"UnknownDistTagError"` \| `"UnknownScriptError"` \| `"UnknownVersionError"` \| `"UnknownVersionRangeError"` \| `"UnreadablePackageJsonError"` \| `"UnresolvablePluginError"` \| `"UnsupportedPackageManagerError"` \| `"ZodValidationError"`

The name of the error.

Should _usually_ be the same as `this.constructor.name`

#### Implementation of

[`midnight-smoker.midnight-smoker/errors.SmokerError.id`](/api/midnight-smoker/midnight-smoker/errors/interfaces/smokererror/#id)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:42](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L42)

## Methods

### format()

> **format**(`verbose`): `string`

Like `toString()`, except fancy.

#### Parameters

• **verbose**: `boolean`= `false`

If `true`, return more stuff.

#### Returns

`string`

#### Implementation of

[`midnight-smoker.midnight-smoker/errors.SmokerError.format`](/api/midnight-smoker/midnight-smoker/errors/interfaces/smokererror/#format)

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
> > **cause**: `undefined` \| `Cause`
>
> ##### code
>
> > **code**: [`SmokerErrorCode`](/api/midnight-smoker/midnight-smoker/errors/type-aliases/smokererrorcode/)
>
> ##### context
>
> > **context**: `undefined` \| `Context`
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

#### Implementation of

[`midnight-smoker.midnight-smoker/errors.SmokerError.toJSON`](/api/midnight-smoker/midnight-smoker/errors/interfaces/smokererror/#tojson)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:73](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L73)
