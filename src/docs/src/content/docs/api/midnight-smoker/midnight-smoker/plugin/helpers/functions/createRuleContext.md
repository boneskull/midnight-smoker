---
editUrl: false
next: false
prev: false
title: "createRuleContext"
---

> **createRuleContext**\<`Cfg`\>(`rule`, `installPath`, `ruleConfig`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`RuleContext`](/api/midnight-smoker/midnight-smoker/rule/classes/rulecontext/)\>\>

Creates a [RuleContext](/api/midnight-smoker/midnight-smoker/rule/classes/rulecontext/) object which will be used to execute a
[Rule](/api/midnight-smoker/midnight-smoker/rule/classes/rule/).

`RuleRunner` components should use this to create a `RuleContext` for each
package and `Rule` they execute.

## Type parameters

• **Cfg** extends `Object` = `Object`

## Parameters

• **rule**: [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`SomeRule`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/somerule/)\>

Rule for context

• **installPath**: `string`

Path to package which will be provided to Rule

• **ruleConfig**: `Cfg`

Specific rule configuration (`severity`, `opts`)

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`RuleContext`](/api/midnight-smoker/midnight-smoker/rule/classes/rulecontext/)\>\>

A new [RuleContext](/api/midnight-smoker/midnight-smoker/rule/classes/rulecontext/)

## Source

[packages/midnight-smoker/src/plugin/helpers.ts:67](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/helpers.ts#L67)
