---
editUrl: false
next: false
prev: false
title: "registerRuleRunner"
---

> **registerRuleRunner**(`registry`, `component`, `options`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)\>

## Parameters

• **registry**: [`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)

• **component**: (...`args`) => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

• **options**: [`RegisterComponentOpts`](/api/midnight-smoker/test-util/index/interfaces/registercomponentopts/)= `{}`

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)\>

## Source

[packages/test-util/src/register-component.ts:69](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/register-component.ts#L69)
