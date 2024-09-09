---
editUrl: false
next: false
prev: false
title: "RunScriptRunnerOpts"
---

Options for running a [SR](/api/midnight-smoker/midnight-smoker/script-runner/index/).

## Extends

- [`Partial`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype )\<[`ScriptRunnerOpts`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/scriptrunneropts/)\>

## Properties

### bail?

> **bail**?: `boolean`

#### Source

[packages/test-util/src/null-script-runner.ts:58](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-script-runner.ts#L58)

***

### emitter?

> **emitter**?: `EventEmitter`

The event emitter to use for emitting events (via the notifier functions).
If not provided, a new `EventEmitter` will be created.

#### Source

[packages/test-util/src/null-script-runner.ts:56](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-script-runner.ts#L56)

***

### signal?

> **signal**?: `AbortSignal`

#### Inherited from

`Partial.signal`

#### Source

packages/midnight-smoker/dist/component/pkg-manager/pkg-manager-schema.d.ts:465
