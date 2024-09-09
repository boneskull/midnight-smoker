---
editUrl: false
next: false
prev: false
title: "Componentizable"
---

> **Componentizable**\<`T`\>: `T` extends `Object` \| `Object` \| `Object` \| `Object` ? `never` : `T`

Checks whether or not the object can be shoehorned into a component. It
cannot have conflicting properties

## Todo

Should we use `never` and the inverse of this conditional?

## Type parameters

• **T** extends `object`

## Source

[packages/midnight-smoker/src/component/component/component.ts:101](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/component/component.ts#L101)
