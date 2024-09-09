---
editUrl: false
next: false
prev: false
title: "createTempDir"
---

> **createTempDir**(`prefix`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`string`\>

Creates a temp dir

## Parameters

• **prefix**: `string`= `TMP_DIR_PREFIX`

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`string`\>

New temp dir path

## Todo

This should be created in `createPluginAPI()` and the prefix should
  include the plugin name.

## Source

[packages/midnight-smoker/src/plugin/helpers.ts:103](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/helpers.ts#L103)
