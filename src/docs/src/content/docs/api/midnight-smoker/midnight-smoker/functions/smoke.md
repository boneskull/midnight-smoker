---
editUrl: false
next: false
prev: false
title: "smoke"
---

> **smoke**(`this`, `opts`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`undefined` \| [`SmokeResults`](/api/midnight-smoker/midnight-smoker/interfaces/smokeresults/)\>

Instantiate `Smoker` and immediately run.

## Parameters

• **this**: `void`

• **opts**: `Object`= `{}`

Options

• **opts\.add?**: `string` \| `string`[]= `undefined`

Add an extra package to the list of packages to be installed

• **opts\.all?**: `boolean`= `undefined`

Operate on all workspaces. The root workspace is omitted unless

• **opts\.bail?**: `boolean`= `undefined`

Fail on first script failure

• **opts\.executor?**: `string`= `undefined`

Component ID of Executor implementation

• **opts\.include-root**: `undefined` \| `boolean`

• **opts\.includeRoot?**: `boolean`= `undefined`

Operate on the root workspace. Only has an effect if `all` is `true`

• **opts\.json?**: `boolean`= `undefined`

Output JSON only

• **opts\.linger?**: `boolean`= `undefined`

Do not delete temp directories after completion

• **opts\.lint?**: `boolean`= `undefined`

If `false`, do not lint when running custom scripts

• **opts\.loose?**: `boolean`= `undefined`

If `true`, fail if a workspace is missing a script

• **opts\.pkg-manager**: `undefined` \| `string` \| `string`[]

• **opts\.pkgManager?**: `string` \| `string`[]= `undefined`

The package manager(s) to use

• **opts\.plugin?**: `string` \| `string`[]= `undefined`

The plugin(s) to load

• **opts\.reporter?**: `string` \| `string`[]= `undefined`

The reporter(s) to use

• **opts\.rule-runner**: `undefined` \| `string`

• **opts\.ruleRunner?**: `string`= `undefined`

The RuleRunners(s) to use

• **opts\.rules?**: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `undefined` \| `"error"` \| `Object` \| `"warn"` \| `"off"` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\> \| [`undefined` \| `"error"` \| `"warn"` \| `"off"`, `undefined` \| `Object` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>] \| `Object`\>= `undefined`

Rule config

• **opts\.script?**: `string` \| `string`[]= `undefined`

Script(s) to run.

• **opts\.script-runner**: `undefined` \| `string`

• **opts\.scriptRunner?**: `string`= `undefined`

ScriptRunners(s) to use.

• **opts\.verbose?**: `boolean`= `undefined`

Verbose logging

• **opts\.workspace?**: `string` \| `string`[]= `undefined`

One or more workspaces to operate in

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`undefined` \| [`SmokeResults`](/api/midnight-smoker/midnight-smoker/interfaces/smokeresults/)\>

## Source

[packages/midnight-smoker/src/index.ts:30](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/index.ts#L30)
