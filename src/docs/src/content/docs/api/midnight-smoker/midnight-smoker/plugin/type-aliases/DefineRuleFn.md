---
editUrl: false
next: false
prev: false
title: "DefineRuleFn"
---

> **DefineRuleFn**: \<`Name`, `Schema`\>(`ruleDef`) => [`PluginAPI`](/api/midnight-smoker/midnight-smoker/plugin/interfaces/pluginapi/)

Defines a new [Rule](/api/midnight-smoker/midnight-smoker/rule/index/) component

## Type parameters

• **Name** extends `string`

• **Schema** extends [`RuleOptionSchema`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/ruleoptionschema/) \| `void` = `void`

## Parameters

• **ruleDef**: [`RuleDef`](/api/midnight-smoker/midnight-smoker/rule/interfaces/ruledef/)\<`Name`, `Schema`\>

## Returns

[`PluginAPI`](/api/midnight-smoker/midnight-smoker/plugin/interfaces/pluginapi/)

## Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:18](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L18)
