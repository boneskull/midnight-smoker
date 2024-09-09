---
editUrl: false
next: false
prev: false
title: "isSerializable"
---

> **isSerializable**\<`T`, `U`\>(`value`): `value is T & Serializable<U>`

Type guard for an object with a `toJSON` method.

## Type parameters

• **T**

• **U** = `unknown`

## Parameters

• **value**: `T`

Any value

## Returns

`value is T & Serializable<U>`

- `true` if `value` is an object with a `toJSON` method

## Source

[packages/midnight-smoker/src/util/util.ts:48](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/util.ts#L48)
