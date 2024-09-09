---
editUrl: false
next: false
prev: false
title: "Component"
---

> **Component**\<`T`\>: `T` & [`ComponentApi`](/api/midnight-smoker/midnight-smoker/component/interfaces/componentapi/)

Some object--ostensibly provided by a plugin--which now has the props from
[ComponentApi](/api/midnight-smoker/midnight-smoker/component/interfaces/componentapi/).

Do not confuse an arbitrary object with an `id` prop with a `Component`
(e.g., a [Owner](/api/midnight-smoker/midnight-smoker/component/interfaces/owner/)).

## Todo

Are we _sure_ we can't extend [Componentizable](Componentizable.md) instead of
  `object`?

## Type parameters

• **T** extends `object`

The type of the component.

## Source

[packages/midnight-smoker/src/component/component/component.ts:120](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/component/component.ts#L120)
