---
editUrl: false
next: false
prev: false
title: "zComponentizable"
---

> **`const`** **zComponentizable**: `ZodType`\<`object`, `ZodTypeDef`, `object`\>

Schema for [Componentizable](/api/midnight-smoker/midnight-smoker/component/type-aliases/componentizable/).

Zod wants to strip `symbol` props, so we use a custom validator.

Functions are mainly allowed through verbatim because of conflicts with
`sinon`; it adds its own `id` prop to stubs.

## Source

[packages/midnight-smoker/src/component/component/component.ts:83](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/component/component.ts#L83)
