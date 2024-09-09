---
editUrl: false
next: false
prev: false
title: "Rule"
---

Represents a _Rule_, which performs a logical grouping of checks upon an
installed (from tarball) package.

## Type parameters

• **Name** extends `string`

• **Schema** extends [`RuleOptionSchema`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/ruleoptionschema/) \| `void` = `void`

## Implements

- [`RuleDef`](/api/midnight-smoker/midnight-smoker/rule/interfaces/ruledef/)\<`Name`, `Schema`\>

## Constructors

### new Rule(def)

> **new Rule**\<`Name`, `Schema`\>(`def`): [`Rule`](/api/midnight-smoker/midnight-smoker/rule/classes/rule/)\<`Name`, `Schema`\>

#### Parameters

• **def**: [`RuleDef`](/api/midnight-smoker/midnight-smoker/rule/interfaces/ruledef/)\<`Name`, `Schema`\>

#### Returns

[`Rule`](/api/midnight-smoker/midnight-smoker/rule/classes/rule/)\<`Name`, `Schema`\>

#### Source

[packages/midnight-smoker/src/component/rule/rule.ts:167](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L167)

## Properties

### check

> **`readonly`** **check**: [`RuleCheckFn`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/rulecheckfn/)\<`Schema`\>

The function which actually performs the check.

#### Implementation of

[`midnight-smoker.midnight-smoker/rule.RuleDef.check`](/api/midnight-smoker/midnight-smoker/rule/interfaces/ruledef/#check)

#### Source

[packages/midnight-smoker/src/component/rule/rule.ts:158](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L158)

***

### defaultSeverity

> **`readonly`** **defaultSeverity**: `"error"` \| `"warn"` \| `"off"`

The default severity for this rule if not supplied by the user

#### Implementation of

[`midnight-smoker.midnight-smoker/rule.RuleDef.defaultSeverity`](/api/midnight-smoker/midnight-smoker/rule/interfaces/ruledef/#defaultseverity)

#### Source

[packages/midnight-smoker/src/component/rule/rule.ts:153](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L153)

***

### description

> **`readonly`** **description**: `string`

The description for this rule

#### Implementation of

[`midnight-smoker.midnight-smoker/rule.RuleDef.description`](/api/midnight-smoker/midnight-smoker/rule/interfaces/ruledef/#description)

#### Source

[packages/midnight-smoker/src/component/rule/rule.ts:148](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L148)

***

### name

> **`readonly`** **name**: `Name`

The name for this rule.

#### Todo

Enforce uniqueness

#### Implementation of

[`midnight-smoker.midnight-smoker/rule.RuleDef.name`](/api/midnight-smoker/midnight-smoker/rule/interfaces/ruledef/#name)

#### Source

[packages/midnight-smoker/src/component/rule/rule.ts:144](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L144)

***

### schema?

> **`readonly`** **schema**?: `Schema`

The options schema for this rule, if any

#### Implementation of

[`midnight-smoker.midnight-smoker/rule.RuleDef.schema`](/api/midnight-smoker/midnight-smoker/rule/interfaces/ruledef/#schema)

#### Source

[packages/midnight-smoker/src/component/rule/rule.ts:163](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L163)

***

### url?

> **`readonly`** **url**?: `string`

#### Implementation of

[`midnight-smoker.midnight-smoker/rule.RuleDef.url`](/api/midnight-smoker/midnight-smoker/rule/interfaces/ruledef/#url)

#### Source

[packages/midnight-smoker/src/component/rule/rule.ts:165](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L165)

***

### componentKind

> **`static`** **`readonly`** **componentKind**: `"Rule"` = `ComponentKinds.Rule`

#### Source

[packages/midnight-smoker/src/component/rule/rule.ts:178](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L178)

***

### getDefaultOptsCache

> **`protected`** **`static`** **`readonly`** **getDefaultOptsCache**: [`WeakMap`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/WeakMap )\<[`RuleOptionSchema`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/ruleoptionschema/)\<`UnknownKeysParam`\>, [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `any`\>\>

#### Source

[packages/midnight-smoker/src/component/rule/rule.ts:338](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L338)

## Accessors

### defaultOptions

> **`get`** **defaultOptions**(): `undefined` \| [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `any`\>

#### Returns

`undefined` \| [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `any`\>

#### Source

[packages/midnight-smoker/src/component/rule/rule.ts:180](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L180)

***

### zRuleSchema

> **`get`** **zRuleSchema**(): `ZodPipeline`\<`ZodUnion`\<[`ZodEffects`\<`ZodDefault`\<`ZodObject`\<`Object`, `"strict"`, `any`, `Object`, `Object`\>\>, `Object`, `undefined` \| `Object`\> \| `ZodEffects`\<`ZodDefault`\<`ZodObject`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `"passthrough"`, `ZodTypeAny`, `objectOutputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>, `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>\>\>, `Object`, `undefined` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>\>, `ZodEffects`\<`ZodDefault`\<`ZodNativeEnum`\<`Object`\>\>, `Object`, `undefined` \| `"error"` \| `"warn"` \| `"off"`\>, `ZodEffects`\<`ZodTuple`\<[`ZodDefault`\<`ZodNativeEnum`\<`Object`\>\>, `ZodDefault`\<`ZodObject`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `"passthrough"`, `ZodTypeAny`, `objectOutputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>, `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>\>\> \| `ZodDefault`\<`ZodObject`\<`Object`, `"strict"`, `any`, `Object`, `Object`\>\>], `null`\>, `Object`, [`undefined` \| `"error"` \| `"warn"` \| `"off"`, `undefined` \| `Object` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>]\>, `ZodObject`\<`Object`, `"strict"`, `ZodTypeAny`, `Object`, `Object`\>]\>, `ZodObject`\<`Object`, `"strict"`, `ZodTypeAny`, `Object`, `Object`\>\>

Returns the entire schema for the value of this rule in the `RuleConfig`
object.

#### Returns

`ZodPipeline`\<`ZodUnion`\<[`ZodEffects`\<`ZodDefault`\<`ZodObject`\<`Object`, `"strict"`, `any`, `Object`, `Object`\>\>, `Object`, `undefined` \| `Object`\> \| `ZodEffects`\<`ZodDefault`\<`ZodObject`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `"passthrough"`, `ZodTypeAny`, `objectOutputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>, `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>\>\>, `Object`, `undefined` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>\>, `ZodEffects`\<`ZodDefault`\<`ZodNativeEnum`\<`Object`\>\>, `Object`, `undefined` \| `"error"` \| `"warn"` \| `"off"`\>, `ZodEffects`\<`ZodTuple`\<[`ZodDefault`\<`ZodNativeEnum`\<`Object`\>\>, `ZodDefault`\<`ZodObject`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `"passthrough"`, `ZodTypeAny`, `objectOutputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>, `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>\>\> \| `ZodDefault`\<`ZodObject`\<`Object`, `"strict"`, `any`, `Object`, `Object`\>\>], `null`\>, `Object`, [`undefined` \| `"error"` \| `"warn"` \| `"off"`, `undefined` \| `Object` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>]\>, `ZodObject`\<`Object`, `"strict"`, `ZodTypeAny`, `Object`, `Object`\>]\>, `ZodObject`\<`Object`, `"strict"`, `ZodTypeAny`, `Object`, `Object`\>\>

#### Source

[packages/midnight-smoker/src/component/rule/rule.ts:188](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L188)

## Methods

### toJSON()

> **toJSON**(): `Object`

Returns this `Rule` in a format suitable for serialization.

#### Returns

`Object`

> ##### defaultSeverity?
>
> > **defaultSeverity**?: `"error"` \| `"warn"` \| `"off"`
>
> ##### description
>
> > **description**: `string`
>
> ##### name
>
> > **name**: `string` = `zNonEmptyString`
>
> ##### url?
>
> > **url**?: `string`
>

#### Source

[packages/midnight-smoker/src/component/rule/rule.ts:201](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L201)

***

### toString()

> **toString**(`this`): `string`

#### Parameters

• **this**: [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`Rule`](/api/midnight-smoker/midnight-smoker/rule/classes/rule/)\<`Name`, `Schema`\>\>

#### Returns

`string`

#### Source

[packages/midnight-smoker/src/component/rule/rule.ts:210](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L210)

***

### create()

> **`static`** **create**\<`Name`, `Id`, `Schema`\>(`this`, `ruleDef`, `owner`): [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`Rule`](/api/midnight-smoker/midnight-smoker/rule/classes/rule/)\<`Name`, `Schema`\>\>

#### Type parameters

• **Name** extends `string`

• **Id** extends `string` = `string`

• **Schema** extends `void` \| [`RuleOptionSchema`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/ruleoptionschema/)\<`UnknownKeysParam`\> = `void`

#### Parameters

• **this**: `void`

• **ruleDef**: [`RuleDef`](/api/midnight-smoker/midnight-smoker/rule/interfaces/ruledef/)\<`Name`, `Schema`\>

• **owner**: [`Owner`](/api/midnight-smoker/midnight-smoker/component/interfaces/owner/)\<`Id`\>

#### Returns

[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`Rule`](/api/midnight-smoker/midnight-smoker/rule/classes/rule/)\<`Name`, `Schema`\>\>

#### Source

[packages/midnight-smoker/src/component/rule/rule.ts:343](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L343)
