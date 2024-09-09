---
editUrl: false
next: false
prev: false
title: "customSchema"
---

> **customSchema**\<`T`\>(`schema`?): `ZodType`\<`T`, `ZodTypeDef`, `T`\>

Wraps a Zod schema in type `T` and validates the schema against it.

Caveats:

- Does not support `ZodEffect` schemas.
- Does not ensure that `T` is assignable to `z.input<T>`

## Type parameters

• **T**

## Parameters

• **schema?**: `ZodTypeAny`

Any Zod schema

## Returns

`ZodType`\<`T`, `ZodTypeDef`, `T`\>

A Zod schema which validates against type `T`

## Todo

Solve the above caveats, if possible

## Source

[packages/midnight-smoker/src/util/schema-util.ts:163](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/schema-util.ts#L163)
