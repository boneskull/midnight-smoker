---
editUrl: false
next: false
prev: false
title: "SmokeFailedError"
---

Thrown when _anything_ in `Smoker.smoke()` fails.

## Extends

- [`AggregateSmokerError`](/api/midnight-smoker/midnight-smoker/errors/classes/aggregatesmokererror/)\<`Object`\>

## Type parameters

• **T**

## Constructors

### new SmokeFailedError(message, errors, __namedParameters)

> **new SmokeFailedError**\<`T`\>(`message`, `errors`, `__namedParameters`): [`SmokeFailedError`](/api/midnight-smoker/midnight-smoker/errors/classes/smokefailederror/)\<`T`\>

#### Parameters

• **message**: `string`

• **errors**: [`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error ) \| [`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error )[]

• **\_\_namedParameters**: `Object`= `{}`

• **\_\_namedParameters\.results?**: `T`

#### Returns

[`SmokeFailedError`](/api/midnight-smoker/midnight-smoker/errors/classes/smokefailederror/)\<`T`\>

#### Overrides

[`midnight-smoker.midnight-smoker/errors.AggregateSmokerError.constructor`](/api/midnight-smoker/midnight-smoker/errors/classes/aggregatesmokererror/#constructors)

#### Source

[packages/midnight-smoker/src/error/smoker-error.ts:34](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/smoker-error.ts#L34)

## Properties

### code

> **`readonly`** **code**: [`SmokerErrorCode`](/api/midnight-smoker/midnight-smoker/errors/type-aliases/smokererrorcode/)

The error code.

#### Inherited from

[`midnight-smoker.midnight-smoker/errors.AggregateSmokerError.code`](/api/midnight-smoker/midnight-smoker/errors/classes/aggregatesmokererror/#code)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:102](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L102)

***

### context?

> **`readonly`** **context**?: `Object`

Arbitrary contextual data

#### Type declaration

##### results?

> **results**?: `T`

#### Inherited from

[`midnight-smoker.midnight-smoker/errors.AggregateSmokerError.context`](/api/midnight-smoker/midnight-smoker/errors/classes/aggregatesmokererror/#context)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:101](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L101)

***

### errors

> **errors**: [`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error )[]

#### Inherited from

[`midnight-smoker.midnight-smoker/errors.AggregateSmokerError.errors`](/api/midnight-smoker/midnight-smoker/errors/classes/aggregatesmokererror/#errors)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:109](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L109)

***

### id

> **`readonly`** **id**: `"SmokeFailedError"` = `'SmokeFailedError'`

The name of the error.

Should _usually_ be the same as `this.constructor.name`

#### Overrides

[`midnight-smoker.midnight-smoker/errors.AggregateSmokerError.id`](/api/midnight-smoker/midnight-smoker/errors/classes/aggregatesmokererror/#abstract-id)

#### Source

[packages/midnight-smoker/src/error/smoker-error.ts:33](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/smoker-error.ts#L33)

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

[`midnight-smoker.midnight-smoker/errors.AggregateSmokerError.format`](/api/midnight-smoker/midnight-smoker/errors/classes/aggregatesmokererror/#format)

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
> > **context**: `undefined` \| `Object`
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

#### Inherited from

[`midnight-smoker.midnight-smoker/errors.AggregateSmokerError.toJSON`](/api/midnight-smoker/midnight-smoker/errors/classes/aggregatesmokererror/#tojson)

#### Source

[packages/midnight-smoker/src/error/base-error.ts:125](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L125)
