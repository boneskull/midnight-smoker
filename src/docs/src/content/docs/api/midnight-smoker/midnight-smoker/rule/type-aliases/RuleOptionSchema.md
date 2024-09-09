---
editUrl: false
next: false
prev: false
title: "RuleOptionSchema"
---

> **RuleOptionSchema**\<`UnknownKeys`\>: `z.ZodObject`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `z.ZodTypeAny`\>, `"opts"`\>, `UnknownKeys`\>

A schema for a rule's options; this is the [RuleDef.schema](/api/midnight-smoker/midnight-smoker/rule/interfaces/ruledef/#schema) prop as
defined by a plugin author.

The schema must be a [z.ZodObject]([object Object]) and each member of the object's shape
must either be _optional_ or have a _default_ value.

## See

[https://zod.dev/?id=json-type](https://zod.dev/?id=json-type)

## Todo

There are certain Zod types which we should disallow. The value must be
  expressible as JSON.

## Todo

`opts` is disallowed as an option name; probably need a tsd test for it

## Todo

The value of in the shape of the ZodObject needs to accept an input
  value of `undefined`.

## Todo

Evaluate whether or not other, non-object types should be allowed as
  rule-specific options

## Type parameters

• **UnknownKeys** extends `z.UnknownKeysParam` = `z.UnknownKeysParam`

## Source

[packages/midnight-smoker/src/component/rule/rule.ts:45](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L45)
