---
editUrl: false
next: false
prev: false
title: "CamelCasedObject"
---

> **CamelCasedObject**\<`T`\>: `{ [K in keyof T as K | CamelCase<K>]: T[K] }`

An object with keys transformed to camelCase.

## Type parameters

• **T**

## Source

[packages/midnight-smoker/src/util/schema-util.ts:190](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/schema-util.ts#L190)
