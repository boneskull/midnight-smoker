---
editUrl: false
next: false
prev: false
title: "zPluginMetadataOpts"
---

> **`const`** **zPluginMetadataOpts**: `ZodPipeline`\<`ZodEffects`\<`ZodObject`\<`Object`, `"strip"`, `ZodTypeAny`, `Object`, `Object`\>, `Object`, `Object`\>, `ZodObject`\<`Object` & `Object`, `"strip"`, `ZodTypeAny`, `Object`, `Object`\>\>

If `id` is undefined, this sets the `id` prop to a relative path based on the
`entryPoint` prop.

It needs to alter the schema to declare that `id` is no longer optional
(allowed to be `undefined`)

## Todo

Is there a better way to do this?

## Source

[packages/midnight-smoker/src/plugin/metadata.ts:87](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L87)
