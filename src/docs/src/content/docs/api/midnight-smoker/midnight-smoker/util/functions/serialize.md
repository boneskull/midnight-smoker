---
editUrl: false
next: false
prev: false
title: "serialize"
---

## serialize(value)

> **serialize**\<`T`\>(`value`): `T`

This is just the identity if `T` is not serializable.

### Type parameters

• **T**

### Parameters

• **value**: `T`

The value to be serialized.

### Returns

`T`

The original value.

### Source

[packages/midnight-smoker/src/util/util.ts:60](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/util.ts#L60)

## serialize(value)

> **serialize**\<`T`, `U`\>(`value`): `U`

Serializes a value to JSON-able if it is serializable.

This should be used where we have a `ThingOne` and a `ThingTwo implements
ThingOne` and `ThingTwo.toJSON()` returns a `ThingOne`, and we want the
`ThingOne` only. Yes, this is a convention.

### Type parameters

• **T** extends [`Serializable`](/api/midnight-smoker/midnight-smoker/util/interfaces/serializable/)\<`U`\>

• **U** = `unknown`

### Parameters

• **value**: `T`

The value to be serialized.

### Returns

`U`

The serialized value if it is serializable, otherwise the original
  value.

### Source

[packages/midnight-smoker/src/util/util.ts:73](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/util.ts#L73)
