---
editUrl: false
next: false
prev: false
title: "SmokerReferenceError"
---

Like a [ReferenceError]([object Object]), but with an error code.

## Extends

- [`BaseSmokerError`](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/)

## Constructors

### new SmokerReferenceError(message, context, cause)

> **new SmokerReferenceError**(`message`, `context`?, `cause`?): [`SmokerReferenceError`](/api/midnight-smoker/midnight-smoker/errors/classes/smokerreferenceerror/)

#### Parameters

• **message**: `string`

• **context?**: `void`

• **cause?**: `void`

#### Returns

[`SmokerReferenceError`](/api/midnight-smoker/midnight-smoker/errors/classes/smokerreferenceerror/)

#### Inherited from

[`midnight-smoker.midnight-smoker/errors.BaseSmokerError.constructor`](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/#constructors)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:43](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L43)

## Properties

### cause?

> **`readonly`** **cause**?: `void`

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

> **`readonly`** **context**?: `void`

Arbitrary contextual data

#### Inherited from

[`midnight-smoker.midnight-smoker/errors.BaseSmokerError.context`](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/#context)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:45](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L45)

***

### id

> **`readonly`** **id**: `"SmokerReferenceError"` = `'SmokerReferenceError'`

The name of the error.

Should _usually_ be the same as `this.constructor.name`

#### Overrides

[`midnight-smoker.midnight-smoker/errors.BaseSmokerError.id`](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/#abstract-id)

#### Source

[packages/midnight-smoker/src/error/common-error.ts:64](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/common-error.ts#L64)

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
> > **cause**: `undefined` \| `void`
>
> ##### code
>
> > **code**: [`SmokerErrorCode`](/api/midnight-smoker/midnight-smoker/errors/type-aliases/smokererrorcode/)
>
> ##### context
>
> > **context**: `undefined` \| `void`
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
