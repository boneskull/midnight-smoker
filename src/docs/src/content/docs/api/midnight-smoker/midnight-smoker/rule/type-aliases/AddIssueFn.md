---
editUrl: false
next: false
prev: false
title: "AddIssueFn"
---

> **AddIssueFn**: (`message`, `data`?) => `void`

The `addIssue` function that a [RuleCheckFn](/api/midnight-smoker/midnight-smoker/rule/type-aliases/rulecheckfn/) uses to create a
[RuleIssue](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/). The [RuleCheckFn](/api/midnight-smoker/midnight-smoker/rule/type-aliases/rulecheckfn/) then returns an array of these.

Member of a [RuleContext](/api/midnight-smoker/midnight-smoker/rule/classes/rulecontext/).

## Parameters

• **message**: `string`

• **data?**: `unknown`

## Returns

`void`

## Source

[packages/midnight-smoker/src/component/rule/context.ts:15](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/context.ts#L15)
