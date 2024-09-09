---
editUrl: false
next: false
prev: false
title: "RuleIssue"
---

An issue raised by a [RuleCheckFn](/api/midnight-smoker/midnight-smoker/rule/type-aliases/rulecheckfn/)

## Implements

- [`StaticRuleIssue`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/staticruleissue/)

## Constructors

### new RuleIssue(__namedParameters)

> **new RuleIssue**(`__namedParameters`): [`RuleIssue`](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/)

#### Parameters

• **\_\_namedParameters**: [`RuleIssueParams`](/api/midnight-smoker/midnight-smoker/rule/interfaces/ruleissueparams/)\<`Object`, `Object`\>

#### Returns

[`RuleIssue`](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/)

#### Source

[packages/midnight-smoker/src/component/rule/issue.ts:83](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/issue.ts#L83)

## Properties

### context

> **`readonly`** **context**: `Object`

The [StaticRuleContext](/api/midnight-smoker/midnight-smoker/rule/type-aliases/staticrulecontext/) for this issue, for public consumption.

#### Type declaration

##### installPath

> **installPath**: `string` = `zNonEmptyString`

##### pkgJson

> **pkgJson**: `Object` & `Object` & `NodeJsStandard` & `PackageJsonStandard` & `NonStandardEntryPoints` & `TypeScriptConfiguration` & `YarnConfiguration` & `JSPMConfiguration` = `zPackageJson`

###### Type declaration

###### Type declaration

##### pkgJsonPath

> **pkgJsonPath**: `string` = `zNonEmptyString`

##### severity

> **severity**: `"error"` \| `"warn"` \| `"off"` = `zRuleSeverity`

#### Implementation of

`StaticRuleIssue.context`

#### Source

[packages/midnight-smoker/src/component/rule/issue.ts:61](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/issue.ts#L61)

***

### data?

> **`readonly`** **data**?: `unknown`

Arbitrary data attached to the issue by the rule implementation

#### Implementation of

`StaticRuleIssue.data`

#### Source

[packages/midnight-smoker/src/component/rule/issue.ts:65](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/issue.ts#L65)

***

### error?

> **`readonly`** **error**?: [`RuleError`](/api/midnight-smoker/midnight-smoker/rule-runner/classes/ruleerror/)

A [RuleError](/api/midnight-smoker/midnight-smoker/rule-runner/classes/ruleerror/) which was caught during the execution of the rule, if
any

#### Implementation of

`StaticRuleIssue.error`

#### Source

[packages/midnight-smoker/src/component/rule/issue.ts:69](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/issue.ts#L69)

***

### id

> **`readonly`** **id**: `string`

Unique identifier; created within constructor

#### Implementation of

`StaticRuleIssue.id`

#### Source

[packages/midnight-smoker/src/component/rule/issue.ts:73](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/issue.ts#L73)

***

### message

> **`readonly`** **message**: `string`

The message for this issue

#### Implementation of

`StaticRuleIssue.message`

#### Source

[packages/midnight-smoker/src/component/rule/issue.ts:77](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/issue.ts#L77)

***

### rule

> **`readonly`** **rule**: `Object`

The serialized rule definition for this issue

#### Type declaration

##### defaultSeverity?

> **defaultSeverity**?: `"error"` \| `"warn"` \| `"off"`

##### description

> **description**: `string`

##### name

> **name**: `string` = `zNonEmptyString`

##### url?

> **url**?: `string`

#### Implementation of

`StaticRuleIssue.rule`

#### Source

[packages/midnight-smoker/src/component/rule/issue.ts:81](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/issue.ts#L81)

## Accessors

### failed

> **`get`** **failed**(): `boolean`

This will be `true` if [severity](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/#severity-1) is RuleSeverities.Error.

#### Returns

`boolean`

#### Source

[packages/midnight-smoker/src/component/rule/issue.ts:101](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/issue.ts#L101)

***

### severity

> **`get`** **severity**(): `"error"` \| `"warn"` \| `"off"`

The severity of this issue, configured by the end user

#### Returns

`"error"` \| `"warn"` \| `"off"`

#### Source

[packages/midnight-smoker/src/component/rule/issue.ts:108](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/issue.ts#L108)

## Methods

### toJSON()

> **toJSON**(): `Object`

Converts the [RuleIssue](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/) object to a JSON representation.

#### Returns

`Object`

The JSON representation of the [RuleIssue](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/) object.

> ##### context
>
> > **context**: `Object` = `zStaticRuleContext`
>
> ##### context.installPath
>
> > **context.installPath**: `string` = `zNonEmptyString`
>
> ##### context.pkgJson
>
> > **context.pkgJson**: `Object` & `Object` & `NodeJsStandard` & `PackageJsonStandard` & `NonStandardEntryPoints` & `TypeScriptConfiguration` & `YarnConfiguration` & `JSPMConfiguration` = `zPackageJson`
>
> ###### Type declaration
>
> ###### Type declaration
>
> ##### context.pkgJsonPath
>
> > **context.pkgJsonPath**: `string` = `zNonEmptyString`
>
> ##### context.severity
>
> > **context.severity**: `"error"` \| `"warn"` \| `"off"` = `zRuleSeverity`
>
> ##### data?
>
> > **data**?: `unknown`
>
> ##### error?
>
> > **error**?: [`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error )
>
> ##### failed
>
> > **failed**: `boolean`
>
> ##### id
>
> > **id**: `string`
>
> ##### message
>
> > **message**: `string`
>
> ##### rule
>
> > **rule**: `Object` = `zStaticRule`
>
> ##### rule.defaultSeverity?
>
> > **rule.defaultSeverity**?: `"error"` \| `"warn"` \| `"off"`
>
> ##### rule.description
>
> > **rule.description**: `string`
>
> ##### rule.name
>
> > **rule.name**: `string` = `zNonEmptyString`
>
> ##### rule.url?
>
> > **rule.url**?: `string`
>
> ##### severity
>
> > **severity**: `"error"` \| `"warn"` \| `"off"`
>

#### Source

[packages/midnight-smoker/src/component/rule/issue.ts:134](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/issue.ts#L134)

***

### compare()

> **`static`** **compare**(`this`, `a`, `b`): `number`

A `compareFn` for [Array.sort]([object Object])

#### Parameters

• **this**: `void`

• **a**: `Object`

A [RuleIssue](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/)

• **a\.context**: `Object`= `zStaticRuleContext`

• **a\.context\.installPath**: `string`= `zNonEmptyString`

• **a\.context\.pkgJson**: `Object` & `Object` & `NodeJsStandard` & `PackageJsonStandard` & `NonStandardEntryPoints` & `TypeScriptConfiguration` & `YarnConfiguration` & `JSPMConfiguration`= `zPackageJson`

• **a\.context\.pkgJsonPath**: `string`= `zNonEmptyString`

• **a\.context\.severity**: `"error"` \| `"warn"` \| `"off"`= `zRuleSeverity`

• **a\.data?**: `unknown`= `undefined`

• **a\.error?**: [`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error )= `undefined`

• **a\.failed**: `boolean`= `undefined`

• **a\.id**: `string`= `undefined`

• **a\.message**: `string`= `undefined`

• **a\.rule**: `Object`= `zStaticRule`

• **a\.rule\.defaultSeverity?**: `"error"` \| `"warn"` \| `"off"`= `undefined`

• **a\.rule\.description**: `string`= `undefined`

• **a\.rule\.name**: `string`= `zNonEmptyString`

• **a\.rule\.url?**: `string`= `undefined`

• **a\.severity**: `"error"` \| `"warn"` \| `"off"`= `undefined`

• **b**: `Object`

Another [RuleIssue](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/)

• **b\.context**: `Object`= `zStaticRuleContext`

• **b\.context\.installPath**: `string`= `zNonEmptyString`

• **b\.context\.pkgJson**: `Object` & `Object` & `NodeJsStandard` & `PackageJsonStandard` & `NonStandardEntryPoints` & `TypeScriptConfiguration` & `YarnConfiguration` & `JSPMConfiguration`= `zPackageJson`

• **b\.context\.pkgJsonPath**: `string`= `zNonEmptyString`

• **b\.context\.severity**: `"error"` \| `"warn"` \| `"off"`= `zRuleSeverity`

• **b\.data?**: `unknown`= `undefined`

• **b\.error?**: [`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error )= `undefined`

• **b\.failed**: `boolean`= `undefined`

• **b\.id**: `string`= `undefined`

• **b\.message**: `string`= `undefined`

• **b\.rule**: `Object`= `zStaticRule`

• **b\.rule\.defaultSeverity?**: `"error"` \| `"warn"` \| `"off"`= `undefined`

• **b\.rule\.description**: `string`= `undefined`

• **b\.rule\.name**: `string`= `zNonEmptyString`

• **b\.rule\.url?**: `string`= `undefined`

• **b\.severity**: `"error"` \| `"warn"` \| `"off"`= `undefined`

#### Returns

`number`

A number where, if positive, means that `a` should come after `b`.
  If negative then the opposite. If 0, then they are equal.

#### Source

[packages/midnight-smoker/src/component/rule/issue.ts:156](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/issue.ts#L156)

***

### create()

> **`static`** **create**\<`Ctx`, `RuleDef`\>(`params`): [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`RuleIssue`](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/)\>

Creates a new readonly [RuleIssue](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/).

#### Type parameters

• **Ctx** extends `Object`

_Exact_ `StaticRuleContext`; _not_ a `RuleContext`

• **RuleDef** extends `Object`

_Exact_ `SomeStaticRuleDef`; _not_ a `StaticRuleDef`

#### Parameters

• **params**: [`RuleIssueParams`](/api/midnight-smoker/midnight-smoker/rule/interfaces/ruleissueparams/)\<`Ctx`, `RuleDef`\>

_Required_ parameters

#### Returns

[`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`RuleIssue`](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/)\>

A new readonly [RuleIssue](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/)

#### Source

[packages/midnight-smoker/src/component/rule/issue.ts:120](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/issue.ts#L120)
