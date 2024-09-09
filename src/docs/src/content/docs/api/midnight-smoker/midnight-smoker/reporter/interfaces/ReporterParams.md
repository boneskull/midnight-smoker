---
editUrl: false
next: false
prev: false
title: "ReporterParams"
---

## Properties

### console

> **console**: `Console`

#### Source

[packages/midnight-smoker/src/component/reporter/reporter-types.ts:27](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/reporter/reporter-types.ts#L27)

***

### emitter

> **emitter**: [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`StrictEmitter`](/api/midnight-smoker/midnight-smoker/event/type-aliases/strictemitter/)\<[`SmokerEvents`](/api/midnight-smoker/midnight-smoker/event/interfaces/smokerevents/)\>\>

#### Source

[packages/midnight-smoker/src/component/reporter/reporter-types.ts:24](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/reporter/reporter-types.ts#L24)

***

### opts

> **opts**: [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<`Object`\>

#### Type declaration

##### add

> **add**: `string`[]

Add an extra package to the list of packages to be installed

##### all

> **all**: `boolean`

Operate on all workspaces. The root workspace is omitted unless

##### bail

> **bail**: `boolean`

Fail on first script failure

##### executor

> **executor**: `string`

Component ID of Executor implementation

##### include-root

> **include-root**: `boolean`

##### includeRoot

> **includeRoot**: `boolean`

Operate on the root workspace. Only has an effect if `all` is `true`

##### json

> **json**: `boolean`

Output JSON only

##### linger

> **linger**: `boolean`

Do not delete temp directories after completion

##### lint

> **lint**: `boolean`

If `false`, do not lint when running custom scripts

##### loose

> **loose**: `boolean`

If `true`, fail if a workspace is missing a script

##### pkg-manager

> **pkg-manager**: `string`[]

##### pkgManager

> **pkgManager**: `string`[]

The package manager(s) to use

##### plugin

> **plugin**: `string`[]

The plugin(s) to load

##### reporter

> **reporter**: `string`[]

The reporter(s) to use

##### rule-runner

> **rule-runner**: `string`

##### ruleRunner

> **ruleRunner**: `string`

The RuleRunners(s) to use

##### rules

> **rules**: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `Object`\>

Rule config

##### script

> **script**: `string`[]

Script(s) to run.

##### script-runner

> **script-runner**: `string`

##### scriptRunner

> **scriptRunner**: `string`

ScriptRunners(s) to use.

##### verbose

> **verbose**: `boolean`

Verbose logging

##### workspace

> **workspace**: `string`[]

One or more workspaces to operate in

#### Source

[packages/midnight-smoker/src/component/reporter/reporter-types.ts:25](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/reporter/reporter-types.ts#L25)

***

### pkgJson

> **pkgJson**: [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<`PackageJson`\>

#### Source

[packages/midnight-smoker/src/component/reporter/reporter-types.ts:26](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/reporter/reporter-types.ts#L26)

***

### stderr

> **stderr**: `WritableStream`

#### Source

[packages/midnight-smoker/src/component/reporter/reporter-types.ts:28](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/reporter/reporter-types.ts#L28)

***

### stdout

> **stdout**: `WritableStream`

#### Source

[packages/midnight-smoker/src/component/reporter/reporter-types.ts:29](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/reporter/reporter-types.ts#L29)
