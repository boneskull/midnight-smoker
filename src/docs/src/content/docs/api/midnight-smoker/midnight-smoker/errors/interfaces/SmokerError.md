---
editUrl: false
next: false
prev: false
title: "SmokerError"
---

Options for [SmokerError](/api/midnight-smoker/midnight-smoker/errors/interfaces/smokererror/) with a generic `Cause` type for `cause` prop.

## Extends

- [`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error )

## Type parameters

• **Context** extends `object` \| `void` = `void`

• **Cause** extends [`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error ) \| `void` = `void`

## Properties

### cause?

> **cause**?: `Cause`

#### Source

[packages/midnight-smoker/src/error/base-error.ts:144](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L144)

***

### code

> **code**: [`SmokerErrorCode`](/api/midnight-smoker/midnight-smoker/errors/type-aliases/smokererrorcode/)

The error code.

#### Source

[packages/midnight-smoker/src/error/base-error.ts:153](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L153)

***

### context?

> **context**?: `Context`

Arbitrary contextual data

#### Source

[packages/midnight-smoker/src/error/base-error.ts:149](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L149)

***

### id

> **id**: `"CleanupError"` \| `"ComponentNameError"` \| `"DirCreationError"` \| `"DisallowedPluginError"` \| `"DuplicatePluginError"` \| `"ExecError"` \| `"InstallError"` \| `"InvalidArgError"` \| `"InvalidComponentError"` \| `"InvalidPluginError"` \| `"MissingPackageJsonError"` \| `"NotImplementedError"` \| `"PackageManagerError"` \| `"PackageManagerIdError"` \| `"PackError"` \| `"PackParseError"` \| `"PluginConflictError"` \| `"PluginImportError"` \| `"PluginInitializationError"` \| `"PluginResolutionError"` \| `"ReporterError"` \| `"RuleError"` \| `"RunScriptError"` \| `"ScriptFailedError"` \| `"SmokeFailedError"` \| `"SmokerReferenceError"` \| `"UnknownDistTagError"` \| `"UnknownScriptError"` \| `"UnknownVersionError"` \| `"UnknownVersionRangeError"` \| `"UnreadablePackageJsonError"` \| `"UnresolvablePluginError"` \| `"UnsupportedPackageManagerError"` \| `"ZodValidationError"`

The name of the error.

Should _usually_ be the same as `this.constructor.name`

#### Source

[packages/midnight-smoker/src/error/base-error.ts:159](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L159)

***

### message

> **message**: `string`

Message!

#### Overrides

`Error.message`

#### Source

[packages/midnight-smoker/src/error/base-error.ts:163](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L163)

## Methods

### format()

> **format**(`verbose`?): `string`

Like `toString()`, except fancy.

#### Parameters

• **verbose?**: `boolean`

If `true`, return more stuff.

#### Returns

`string`

#### Source

[packages/midnight-smoker/src/error/base-error.ts:169](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L169)

***

### toJSON()

> **toJSON**(): `object`

Returns the error in a JSON-serializable format.

#### Returns

`object`

#### Source

[packages/midnight-smoker/src/error/base-error.ts:174](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L174)
