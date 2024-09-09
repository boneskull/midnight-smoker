---
editUrl: false
next: false
prev: false
title: "instanceofSchema"
---

> **instanceofSchema**\<`E`\>(`ctor`): `ZodType`\<[`InstanceType`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#instancetypetype )\<`E`\>, `ZodTypeDef`, [`InstanceType`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#instancetypetype )\<`E`\>\>

Returns a schema that tests if a value is an instance of a given class.

## Type parameters

• **E** extends `Class`\<`any`\>

The class type to check against.

## Parameters

• **ctor**: `E`

The class constructor to check against.

## Returns

`ZodType`\<[`InstanceType`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#instancetypetype )\<`E`\>, `ZodTypeDef`, [`InstanceType`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#instancetypetype )\<`E`\>\>

A custom zod validator function that checks if the value is an
  instance of the given class.

## Todo

Determine if this is something we should be in the business of doing at
  all

## Source

[packages/midnight-smoker/src/util/schema-util.ts:128](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/schema-util.ts#L128)
