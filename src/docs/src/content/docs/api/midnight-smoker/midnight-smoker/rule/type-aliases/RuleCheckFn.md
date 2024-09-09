---
editUrl: false
next: false
prev: false
title: "RuleCheckFn"
---

> **RuleCheckFn**\<`Schema`\>: (`ctx`, `opts`) => `void` \| [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`void`\>

The function which actually performs the check within a [Rule](/api/midnight-smoker/midnight-smoker/rule/classes/rule/).

This is defined in a [RuleDef](/api/midnight-smoker/midnight-smoker/rule/interfaces/ruledef/) as the [Rule.check](/api/midnight-smoker/midnight-smoker/rule/classes/rule/#check) prop.

## Type parameters

• **Schema** extends [`RuleOptionSchema`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/ruleoptionschema/) \| `void` = `void`

## Parameters

• **ctx**: [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`RuleContext`](/api/midnight-smoker/midnight-smoker/rule/classes/rulecontext/)\>

• **opts**: [`RuleOptions`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/ruleoptions/)\<`Schema`\>

## Returns

`void` \| [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`void`\>

## Source

[packages/midnight-smoker/src/component/rule/rule.ts:66](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule.ts#L66)
