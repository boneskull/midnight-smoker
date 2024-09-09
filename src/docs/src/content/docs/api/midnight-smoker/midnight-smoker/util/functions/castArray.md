---
editUrl: false
next: false
prev: false
title: "castArray"
---

> **castArray**\<`T`\>(`value`?): `T`[]

Casts a defined value to an array of non-`undefined` values.

If `value` is `undefined`, returns an empty array. If `value` is an `Array`,
returns the compacted array. Otherwise, returns an array with `value` as the
only element.

This differs from [_castArray _.castArray]([object Object]) in that it refuses to put
`undefined` values within the array.

## Type parameters

• **T**

## Parameters

• **value?**: `Many`\<`T`\>

Any value

## Returns

`T`[]

An array, for sure!

## Source

[packages/midnight-smoker/src/util/schema-util.ts:46](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/schema-util.ts#L46)
