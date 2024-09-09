---
editUrl: false
next: false
prev: false
title: "ExecutorOpts"
---

Options for Executor.exec

## Properties

### cwd?

> **cwd**?: `string`

The working directory for the command.

Overrides [SpawnOptions.cwd]([object Object])

#### Source

[packages/midnight-smoker/src/component/executor/executor.ts:45](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/executor/executor.ts#L45)

***

### signal?

> **signal**?: `AbortSignal`

An `AbortSignal` which can be used to cancel the command.

#### Source

[packages/midnight-smoker/src/component/executor/executor.ts:38](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/executor/executor.ts#L38)

***

### verbose?

> **verbose**?: `boolean`

If this is true, `stdout` and `stderr` will be echoed to the terminal.

#### Source

[packages/midnight-smoker/src/component/executor/executor.ts:33](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/executor/executor.ts#L33)
