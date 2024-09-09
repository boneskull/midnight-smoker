---
editUrl: false
next: false
prev: false
title: "createExecaMock"
---

> **createExecaMock**(`readableMocks`): [`ExecaMock`](/api/midnight-smoker/test-util/execa/interfaces/execamock/)

Creates a mock for the `execa` package, containing the `node` function.

## Parameters

• **readableMocks**: [`Partial`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype )\<[`ReadableMocks`](/api/midnight-smoker/test-util/execa/interfaces/readablemocks/)\>= `{}`

Optional; mocks for the `stdout` and `stderr` streams.

## Returns

[`ExecaMock`](/api/midnight-smoker/test-util/execa/interfaces/execamock/)

The `ExecaMock` object.

## Source

[packages/test-util/src/execa.ts:33](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/execa.ts#L33)
