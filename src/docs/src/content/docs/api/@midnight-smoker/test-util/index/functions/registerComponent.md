---
editUrl: false
next: false
prev: false
title: "registerComponent"
---

> **registerComponent**\<`T`\>(`registry`, `type`, `component`, `__namedParameters`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)\>

## Type parameters

• **T** extends keyof `ComponentTypes`

## Parameters

• **registry**: [`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)

• **type**: `T`

• **component**: `ComponentTypes`\[`T`\]

• **\_\_namedParameters**: [`RegisterComponentOpts`](/api/midnight-smoker/test-util/index/interfaces/registercomponentopts/)= `{}`

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)\>

## Source

[packages/test-util/src/register-component.ts:34](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/register-component.ts#L34)
