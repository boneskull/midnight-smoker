---
editUrl: false
next: false
prev: false
title: "serializeObject"
---

> **serializeObject**\<`T`\>(`schema`): `ZodPipeline`\<`ZodEffects`\<`T`, `unknown`, `input`\<`T`\>\>, `T`\>

Returns a schema which transforms a schema such that if a schema's output is
an object, and that object has a `toJSON` method, call it.

`midnight-smoker` has a convention where many classes implement a "static"
interface, and the `toJSON` method returns such a type. This type is used for
passing thru the module edge; e.g., via an `EventEmitter`.

## Type parameters

• **T** extends `ZodTypeAny`

## Parameters

• **schema**: `T`

The schema to use for serialization.

## Returns

`ZodPipeline`\<`ZodEffects`\<`T`, `unknown`, `input`\<`T`\>\>, `T`\>

The serialized object.

## Source

[packages/midnight-smoker/src/util/schema-util.ts:143](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/schema-util.ts#L143)
