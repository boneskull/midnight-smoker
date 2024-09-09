---
editUrl: false
next: false
prev: false
title: "component"
---

> **component**\<`T`\>(`componentDef`): [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<`T`\>

Wraps an object in a [Component](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/), which provides [ComponentApi](/api/midnight-smoker/midnight-smoker/component/interfaces/componentapi/)

## Type parameters

• **T** extends `object`

Type to wrap; `object` is intentional, as this may be a
  function as well

## Parameters

• **componentDef**: [`ComponentDef`](/api/midnight-smoker/midnight-smoker/component/interfaces/componentdef/)\<`T`\>

Component definition object

## Returns

[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<`T`\>

The same object, but as a [Component](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)

## Throws

InvalidArgError - If `componentDef` is invalid

## Source

[packages/midnight-smoker/src/component/component/component.ts:153](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/component/component.ts#L153)
