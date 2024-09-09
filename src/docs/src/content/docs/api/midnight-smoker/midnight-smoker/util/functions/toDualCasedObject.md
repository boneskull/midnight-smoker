---
editUrl: false
next: false
prev: false
title: "toDualCasedObject"
---

> **toDualCasedObject**\<`T`\>(`obj`): [`DualCasedObject`](/api/midnight-smoker/midnight-smoker/util/type-aliases/dualcasedobject/)\<`T`\>

Creates a new object with the same keys as `obj`, but with each key
duplicated both as camelCase and kebab-case.

## Type parameters

• **T** extends `object`

## Parameters

• **obj**: `T`

Any object

## Returns

[`DualCasedObject`](/api/midnight-smoker/midnight-smoker/util/type-aliases/dualcasedobject/)\<`T`\>

New object with probably more keys

## Source

[packages/midnight-smoker/src/util/schema-util.ts:217](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/schema-util.ts#L217)
