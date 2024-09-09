---
editUrl: false
next: false
prev: false
title: "Executor"
---

> **Executor**: (`spec`, `args`, `opts`?, `spawnOpts`?) => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`ExecResult`](/api/midnight-smoker/midnight-smoker/executor/type-aliases/execresult/)\>

## Parameters

• **spec**: [`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)

• **args**: `string`[]

• **opts?**: [`ExecutorOpts`](/api/midnight-smoker/midnight-smoker/executor/interfaces/executoropts/)

• **spawnOpts?**: [`SpawnOpts`](/api/midnight-smoker/midnight-smoker/executor/type-aliases/spawnopts/)

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`ExecResult`](/api/midnight-smoker/midnight-smoker/executor/type-aliases/execresult/)\>

## Source

[packages/midnight-smoker/src/component/executor/executor.ts:80](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/executor/executor.ts#L80)
