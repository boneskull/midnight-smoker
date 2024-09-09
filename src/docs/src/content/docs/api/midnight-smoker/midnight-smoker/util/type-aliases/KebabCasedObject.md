---
editUrl: false
next: false
prev: false
title: "KebabCasedObject"
---

> **KebabCasedObject**\<`T`\>: `{ [K in keyof T as K | KebabCase<K>]: T[K] }`

An object with keys transformed to kebab-case.

## Type parameters

• **T**

The original object type.

## Source

[packages/midnight-smoker/src/util/schema-util.ts:199](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/schema-util.ts#L199)
