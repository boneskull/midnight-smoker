---
editUrl: false
next: false
prev: false
title: "zNonEmptyStringOrArrayThereof"
---

> **`const`** **zNonEmptyStringOrArrayThereof**: `ZodPipeline`\<`ZodEffects`\<`ZodDefault`\<`ZodUnion`\<[`ZodString`, `ZodArray`\<`ZodString`, `"many"`\>]\>\>, `string`[], `undefined` \| `string` \| `string`[]\>, `ZodArray`\<`ZodString`, `"many"`\>\>

Schema representing a non-empty string or array of non-empty strings, which
is then cast to an array

## Source

[packages/midnight-smoker/src/util/schema-util.ts:86](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/schema-util.ts#L86)
