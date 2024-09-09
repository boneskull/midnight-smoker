---
editUrl: false
next: false
prev: false
title: "registerPackageManager"
---

> **registerPackageManager**(`registry`, `component`, `options`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)\>

## Parameters

• **registry**: [`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)

• **component**: `Object`

• **component\.accepts**: `string` \| (`semver`) => `boolean` \| `Range` & `undefined` \| `string` \| `Range` \| (`semver`) => `boolean`

• **component\.bin**: `string`

• **component\.create**: (`args_0`, `args_1`, `args_2`, `args_3`) => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

• **component\.lockfile?**: `string`

• **options**: [`RegisterComponentOpts`](/api/midnight-smoker/test-util/index/interfaces/registercomponentopts/)= `{}`

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)\>

## Source

[packages/test-util/src/register-component.ts:93](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/register-component.ts#L93)
