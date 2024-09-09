---
editUrl: false
next: false
prev: false
title: "AggregateSmokerError"
---

Base class for all aggregate exceptions thrown by `midnight-smoker`.

This should only be used if _multiple_ errors are being collected--not just
catching some `Error` then throwing our own; use [BaseSmokerError](/api/midnight-smoker/midnight-smoker/errors/classes/basesmokererror/) for
that.

## Extends

- [`AggregateError`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/AggregateError )

## Type parameters

• **Context** extends `object` \| `void` = `void`

Arbitrary per-exception-class data to attach to the
  error.

## Implements

- [`SmokerError`](/api/midnight-smoker/midnight-smoker/errors/interfaces/smokererror/)\<`Context`\>

## Constructors

### new AggregateSmokerError(message, errors, context)

> **new AggregateSmokerError**\<`Context`\>(`message`, `errors`?, `context`?): [`AggregateSmokerError`](/api/midnight-smoker/midnight-smoker/errors/classes/aggregatesmokererror/)\<`Context`\>

#### Parameters

• **message**: `string`

• **errors?**: [`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error ) \| [`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error )[]

• **context?**: `Context`

#### Returns

[`AggregateSmokerError`](/api/midnight-smoker/midnight-smoker/errors/classes/aggregatesmokererror/)\<`Context`\>

#### Overrides

`AggregateError.constructor`

#### Source

[packages/midnight-smoker/src/error/base-error.ts:111](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L111)

## Properties

### code

> **`readonly`** **code**: [`SmokerErrorCode`](/api/midnight-smoker/midnight-smoker/errors/type-aliases/smokererrorcode/)

The error code.

#### Implementation of

[`midnight-smoker.midnight-smoker/errors.SmokerError.code`](/api/midnight-smoker/midnight-smoker/errors/interfaces/smokererror/#code)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:102](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L102)

***

### context?

> **`readonly`** **context**?: `Context`

Arbitrary contextual data

#### Implementation of

[`midnight-smoker.midnight-smoker/errors.SmokerError.context`](/api/midnight-smoker/midnight-smoker/errors/interfaces/smokererror/#context)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:101](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L101)

***

### errors

> **errors**: [`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error )[]

#### Overrides

`AggregateError.errors`

#### Source

[packages/midnight-smoker/src/error/base-error.ts:109](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L109)

***

### `abstract` id

> **`abstract`** **`readonly`** **id**: `"CleanupError"` \| `"ComponentNameError"` \| `"DirCreationError"` \| `"DisallowedPluginError"` \| `"DuplicatePluginError"` \| `"ExecError"` \| `"InstallError"` \| `"InvalidArgError"` \| `"InvalidComponentError"` \| `"InvalidPluginError"` \| `"MissingPackageJsonError"` \| `"NotImplementedError"` \| `"PackageManagerError"` \| `"PackageManagerIdError"` \| `"PackError"` \| `"PackParseError"` \| `"PluginConflictError"` \| `"PluginImportError"` \| `"PluginInitializationError"` \| `"PluginResolutionError"` \| `"ReporterError"` \| `"RuleError"` \| `"RunScriptError"` \| `"ScriptFailedError"` \| `"SmokeFailedError"` \| `"SmokerReferenceError"` \| `"UnknownDistTagError"` \| `"UnknownScriptError"` \| `"UnknownVersionError"` \| `"UnknownVersionRangeError"` \| `"UnreadablePackageJsonError"` \| `"UnresolvablePluginError"` \| `"UnsupportedPackageManagerError"` \| `"ZodValidationError"`

The name of the error.

Should _usually_ be the same as `this.constructor.name`

#### Implementation of

[`midnight-smoker.midnight-smoker/errors.SmokerError.id`](/api/midnight-smoker/midnight-smoker/errors/interfaces/smokererror/#id)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:103](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L103)

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

[packages/midnight-smoker/src/error/base-error.ts:121](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L121)

***

### toJSON()

> **toJSON**(): `Object`

Returns the error in a JSON-serializable format.

#### Returns

`Object`

> ##### code
>
> > **code**: [`SmokerErrorCode`](/api/midnight-smoker/midnight-smoker/errors/type-aliases/smokererrorcode/)
>
> ##### context
>
> > **context**: `undefined` \| `Context`
>
> ##### errors
>
> > **errors**: [`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error )[]
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

[packages/midnight-smoker/src/error/base-error.ts:125](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L125)
