---
editUrl: false
next: false
prev: false
title: "getConfigForRule"
---

> **getConfigForRule**\<`Name`, `Schema`\>(`rule`, `config`): [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`RuleConfig`](/api/midnight-smoker/midnight-smoker/rule/interfaces/ruleconfig/)\<`Schema`\>\>

## Type parameters

• **Name** extends `string`

• **Schema** extends `void` \| [`RuleOptionSchema`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/ruleoptionschema/) = `void`

## Parameters

• **rule**: [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`Rule`](/api/midnight-smoker/midnight-smoker/rule/classes/rule/)\<`Name`, `Schema`\>\>

• **config**: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `Object`\>

## Returns

[`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`RuleConfig`](/api/midnight-smoker/midnight-smoker/rule/interfaces/ruleconfig/)\<`Schema`\>\>

## Source

[packages/midnight-smoker/src/plugin/helpers.ts:86](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/helpers.ts#L86)
