---
editUrl: false
next: false
prev: false
title: "RuleDef"
---

The raw definition of a [Rule](/api/midnight-smoker/midnight-smoker/rule/classes/rule/), as defined by a implementor.

## Extends

- [`StaticRule`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/staticrule/)

## Type parameters

• **Name** extends `string`

• **Schema** extends [`RuleOptionSchema`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/ruleoptionschema/) \| `void` = `void`

## Properties

### check

> **check**: [`RuleCheckFn`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/rulecheckfn/)\<`Schema`\>

The function which actually performs the check.

#### Source

[packages/midnight-smoker/src/component/rule/rule.ts:84](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L84)

***

### defaultSeverity?

> **defaultSeverity**?: `"error"` \| `"warn"` \| `"off"`

#### Inherited from

`StaticRule.defaultSeverity`

#### Source

[packages/midnight-smoker/src/component/rule/static.ts:28](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/static.ts#L28)

***

### description

> **description**: `string`

#### Inherited from

`StaticRule.description`

#### Source

[packages/midnight-smoker/src/component/rule/static.ts:29](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/static.ts#L29)

***

### name

> **name**: `Name`

#### Overrides

`StaticRule.name`

#### Source

[packages/midnight-smoker/src/component/rule/rule.ts:80](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L80)

***

### schema?

> **schema**?: `Schema`

Options schema for this rule, if any

#### Source

[packages/midnight-smoker/src/component/rule/rule.ts:88](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L88)

***

### url?

> **url**?: `string`

#### Inherited from

`StaticRule.url`

#### Source

[packages/midnight-smoker/src/component/rule/static.ts:31](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/static.ts#L31)
