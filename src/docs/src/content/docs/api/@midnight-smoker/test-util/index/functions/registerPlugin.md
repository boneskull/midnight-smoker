---
editUrl: false
next: false
prev: false
title: "registerPlugin"
---

> **registerPlugin**(`registry`, `opts`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)\>

Creates a transient plugin for testing purposes.

When provided no options, it creates a no-op plugin with the name
[DEFAULT_TEST_PLUGIN_NAME](/api/midnight-smoker/test-util/constants/variables/default_test_plugin_name/) and other default values.

## Parameters

• **registry**: [`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)

Plugin registry

• **opts**: [`RegisterPluginOpts`](/api/midnight-smoker/test-util/index/type-aliases/registerpluginopts/)= `{}`

Options; optionally supply `plugin` or `factory` but not both

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)\>

The [PluginRegistry](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/) instance

## Source

[packages/test-util/src/register-plugin.ts:48](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/register-plugin.ts#L48)
