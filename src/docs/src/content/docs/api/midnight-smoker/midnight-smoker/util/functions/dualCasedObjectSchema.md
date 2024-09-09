---
editUrl: false
next: false
prev: false
title: "dualCasedObjectSchema"
---

> **dualCasedObjectSchema**\<`T`\>(`schema`): `ZodObject`\<`Object`, `any`, `any`, `Object`, `Object`\>

Creates a new schema based on `schema` which aliases the object keys to both
camelCase and kebab-case.

## Type parameters

• **T** extends `AnyZodObject`

## Parameters

• **schema**: `T`

Probably a rule schema

## Returns

`ZodObject`\<`Object`, `any`, `any`, `Object`, `Object`\>

New schema

>
>

## Source

[packages/midnight-smoker/src/util/schema-util.ts:233](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/schema-util.ts#L233)
