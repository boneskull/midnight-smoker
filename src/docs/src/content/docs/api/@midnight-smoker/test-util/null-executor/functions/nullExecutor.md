---
editUrl: false
next: false
prev: false
title: "nullExecutor"
---

> **nullExecutor**(`spec`, `args`, `opts`?, `spawnOpts`?): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

Executes a command using a "null" executor which does nothing.

## Parameters

• **spec**: [`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)

• **args**: `string`[]

• **opts?**: [`ExecutorOpts`](/api/midnight-smoker/midnight-smoker/executor/interfaces/executoropts/)

• **spawnOpts?**: [`SpawnOpts`](/api/midnight-smoker/midnight-smoker/executor/type-aliases/spawnopts/)

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

> ### all?
>
> > **all**?: `string`
>
> ### command
>
> > **command**: `string`
>
> ### exitCode
>
> > **exitCode**: `number`
>
> ### failed
>
> > **failed**: `boolean`
>
> ### stderr
>
> > **stderr**: `string`
>
> ### stdout
>
> > **stdout**: `string`
>

## Source

[packages/test-util/src/null-executor.ts:9](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-executor.ts#L9)
