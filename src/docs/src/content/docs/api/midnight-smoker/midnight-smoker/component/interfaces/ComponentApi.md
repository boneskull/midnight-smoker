---
editUrl: false
next: false
prev: false
title: "ComponentApi"
---

The properteries which [component](/api/midnight-smoker/midnight-smoker/component/functions/component/) grafts onto a [Componentizable](/api/midnight-smoker/midnight-smoker/component/type-aliases/componentizable/)
object, creating a [Component](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/).

## Properties

### [kComponentId]

> **`readonly`** **[kComponentId]**: [`ComponentId`](/api/midnight-smoker/midnight-smoker/component/classes/componentid/)

The raw [ComponentId](/api/midnight-smoker/midnight-smoker/component/classes/componentid/) object

#### Source

[packages/midnight-smoker/src/component/component/component.ts:64](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/component/component.ts#L64)

***

### id

> **`readonly`** **id**: `string`

The unique identifier for the component; [ComponentId.id](/api/midnight-smoker/midnight-smoker/component/classes/componentid/#id)

#### Source

[packages/midnight-smoker/src/component/component/component.ts:60](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/component/component.ts#L60)

***

### isBlessed

> **`readonly`** **isBlessed**: `boolean`

The result of [ComponentId.isBlessed](/api/midnight-smoker/midnight-smoker/component/classes/componentid/#isblessed)

#### Source

[packages/midnight-smoker/src/component/component/component.ts:68](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/component/component.ts#L68)

***

### kind

> **`readonly`** **kind**: `"Rule"` \| `"RuleRunner"` \| `"ScriptRunner"` \| `"PkgManagerDef"` \| `"Executor"` \| `"Reporter"`

The component kind

#### Source

[packages/midnight-smoker/src/component/component/component.ts:72](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/component/component.ts#L72)
