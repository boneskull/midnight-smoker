---
editUrl: false
next: false
prev: false
title: "registerRule"
---

> **registerRule**(`registry`, `factoryOrRuleDef`, `pluginName`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`SomeRule`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/somerule/)\>\>

Registers a rule in the plugin registry.

## Parameters

• **registry**: [`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)

The plugin registry to use (optional, default is a new
  instance of PluginRegistry).

• **factoryOrRuleDef**: [`PluginFactory`](/api/midnight-smoker/midnight-smoker/plugin/type-aliases/pluginfactory/) \| [`Partial`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype )\<[`SomeRuleDef`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/someruledef/)\>

The factory function or partial rule definition.

• **pluginName**: `string`= `DEFAULT_TEST_PLUGIN_NAME`

The name of the plugin (optional, default is
  'test-plugin').

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`SomeRule`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/somerule/)\>\>

The registered rule.

## Source

[packages/test-util/src/register-rule.ts:30](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/register-rule.ts#L30)
