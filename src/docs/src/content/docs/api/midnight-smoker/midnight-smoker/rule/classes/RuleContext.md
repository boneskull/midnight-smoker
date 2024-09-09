---
editUrl: false
next: false
prev: false
title: "RuleContext"
---

A context object which is provided to a [RuleCheckFn](/api/midnight-smoker/midnight-smoker/rule/type-aliases/rulecheckfn/), containing
information about the current package to be checked and how to report a
failure.

## Implements

- [`StaticRuleContext`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/staticrulecontext/)

## Constructors

### new RuleContext(rule, staticCtx)

> **`protected`** **new RuleContext**(`rule`, `staticCtx`): [`RuleContext`](/api/midnight-smoker/midnight-smoker/rule/classes/rulecontext/)

#### Parameters

• **rule**: [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<`Object`\>

• **staticCtx**: `Object`

• **staticCtx\.installPath**: `string`= `zNonEmptyString`

• **staticCtx\.pkgJson**: `Object` & `Object` & `NodeJsStandard` & `PackageJsonStandard` & `NonStandardEntryPoints` & `TypeScriptConfiguration` & `YarnConfiguration` & `JSPMConfiguration`= `zPackageJson`

• **staticCtx\.pkgJsonPath**: `string`= `zNonEmptyString`

• **staticCtx\.severity**: `"error"` \| `"warn"` \| `"off"`= `zRuleSeverity`

#### Returns

[`RuleContext`](/api/midnight-smoker/midnight-smoker/rule/classes/rulecontext/)

#### Source

[packages/midnight-smoker/src/component/rule/context.ts:35](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/context.ts#L35)

## Properties

### addIssue

> **addIssue**: [`AddIssueFn`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/addissuefn/)

Adds an issue to the list of issues for this context.

This should be called by the [RuleCheckFn](/api/midnight-smoker/midnight-smoker/rule/type-aliases/rulecheckfn/) when it detects a problem.

#### Param

Message for the issue

#### Param

Additional data to include in the issue

#### Source

[packages/midnight-smoker/src/component/rule/context.ts:134](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/context.ts#L134)

## Accessors

### installPath

> **`get`** **installPath**(): `string`

The absolute path to this context's package's root directory.

This is the same as `path.dirname(pkgJsonPath)`

#### Returns

`string`

#### Source

[packages/midnight-smoker/src/component/rule/context.ts:76](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/context.ts#L76)

***

### issues

> **`get`** **issues**(): [`RuleIssue`](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/)[]

Gets a _copy_ of the list of issues.

#### Returns

[`RuleIssue`](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/)[]

An array of issues.

#### Source

[packages/midnight-smoker/src/component/rule/context.ts:60](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/context.ts#L60)

***

### pkgJson

> **`get`** **pkgJson**(): `PackageJson`

The parsed `package.json` for the package being checked.

_Not_ normalized.

#### Returns

`PackageJson`

The parsed `package.json` for the package being checked.

#### Source

[packages/midnight-smoker/src/component/rule/context.ts:51](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/context.ts#L51)

***

### pkgJsonPath

> **`get`** **pkgJsonPath**(): `string`

The absolute path to this context's package's `package.json`.

#### Returns

`string`

#### Source

[packages/midnight-smoker/src/component/rule/context.ts:67](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/context.ts#L67)

***

### severity

> **`get`** **severity**(): `"error"` \| `"warn"` \| `"off"`

The severity level for this rule application (as chosen by the user)

#### Returns

`"error"` \| `"warn"` \| `"off"`

#### Source

[packages/midnight-smoker/src/component/rule/context.ts:83](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/context.ts#L83)

## Methods

### addIssueFromError()

> **addIssueFromError**(`err`): `void`

This should be used when a [RuleCheckFn](/api/midnight-smoker/midnight-smoker/rule/type-aliases/rulecheckfn/) throws or rejects.

Under normal operation, this shouldn't happen.

#### Parameters

• **err**: [`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error )

Error to add as an issue

#### Returns

`void`

#### Source

[packages/midnight-smoker/src/component/rule/context.ts:104](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/context.ts#L104)

***

### finalize()

> **finalize**(): `undefined` \| readonly [`RuleIssue`](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/)[]

Finalizes the rule context and returns the collected issues.

#### Returns

`undefined` \| readonly [`RuleIssue`](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/)[]

An array of [RuleIssue](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/) objects or `undefined` if no issues
  were collected.

#### Todo

This is currently called by the RuleRunner, but it should be called
  by something else instead. a RuleRunnerController?

#### Source

[packages/midnight-smoker/src/component/rule/context.ts:162](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/context.ts#L162)

***

### toJSON()

> **toJSON**(): `Object`

Omits the [RuleContext.pkgJson](/api/midnight-smoker/midnight-smoker/rule/classes/rulecontext/#pkgjson) property (too big).

#### Returns

`Object`

A JSON-serializable representation of this object

> ##### installPath
>
> > **installPath**: `string` = `zNonEmptyString`
>
> ##### pkgJson
>
> > **pkgJson**: `Object` & `Object` & `NodeJsStandard` & `PackageJsonStandard` & `NonStandardEntryPoints` & `TypeScriptConfiguration` & `YarnConfiguration` & `JSPMConfiguration` = `zPackageJson`
>
> ###### Type declaration
>
> ###### Type declaration
>
> ##### pkgJsonPath
>
> > **pkgJsonPath**: `string` = `zNonEmptyString`
>
> ##### severity
>
> > **severity**: `"error"` \| `"warn"` \| `"off"` = `zRuleSeverity`
>

#### Source

[packages/midnight-smoker/src/component/rule/context.ts:174](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/context.ts#L174)

***

### create()

> **`static`** **create**(`rule`, `staticCtx`): [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`RuleContext`](/api/midnight-smoker/midnight-smoker/rule/classes/rulecontext/)\>

Creates a [RuleContext](/api/midnight-smoker/midnight-smoker/rule/classes/rulecontext/).

#### Parameters

• **rule**: [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<`Object`\>

• **staticCtx**: `Object`

• **staticCtx\.installPath**: `string`= `zNonEmptyString`

• **staticCtx\.pkgJson**: `Object` & `Object` & `NodeJsStandard` & `PackageJsonStandard` & `NonStandardEntryPoints` & `TypeScriptConfiguration` & `YarnConfiguration` & `JSPMConfiguration`= `zPackageJson`

• **staticCtx\.pkgJsonPath**: `string`= `zNonEmptyString`

• **staticCtx\.severity**: `"error"` \| `"warn"` \| `"off"`= `zRuleSeverity`

#### Returns

[`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`RuleContext`](/api/midnight-smoker/midnight-smoker/rule/classes/rulecontext/)\>

#### Source

[packages/midnight-smoker/src/component/rule/context.ts:90](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/context.ts#L90)
