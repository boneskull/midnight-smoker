---
editUrl: false
next: false
prev: false
title: "Smoker"
---

The main class.

## Extends

- `TypeRecord`\<`EventEmitter`, [`SmokerEvents`](/api/midnight-smoker/midnight-smoker/event/interfaces/smokerevents/), [`SmokerEvents`](/api/midnight-smoker/midnight-smoker/event/interfaces/smokerevents/), `this`\> & [`Pick`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys )\<`EventEmitter`, `"off"` \| *typeof* `captureRejectionSymbol` \| `"removeAllListeners"` \| `"setMaxListeners"` \| `"getMaxListeners"` \| `"listeners"` \| `"rawListeners"` \| `"listenerCount"` \| `"prependListener"` \| `"prependOnceListener"` \| `"eventNames"`\> & [`Pick`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys )\<`OverriddenMethods`\<`EventEmitter`, [`SmokerEvents`](/api/midnight-smoker/midnight-smoker/event/interfaces/smokerevents/), [`SmokerEvents`](/api/midnight-smoker/midnight-smoker/event/interfaces/smokerevents/)\>, `"on"` \| `"once"` \| `"emit"` \| `"addListener"` \| `"removeListener"`\>

## Properties

### opts

> **`readonly`** **opts**: [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<`Object`\>

Used for emitting [SmokerEvent.SmokeOk](Property SmokeOk: "SmokeOk") or
[SmokerEvent.SmokeFailed](Property SmokeFailed: "SmokeFailed")

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

[packages/midnight-smoker/src/smoker.ts:123](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L123)

***

### scripts

> **`readonly`** **scripts**: `string`[]

List of scripts to run in each workspace

#### Source

[packages/midnight-smoker/src/smoker.ts:127](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L127)

## Methods

### cleanup()

> **cleanup**(): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`void`\>

Cleans up temp directories associated with package managers.

If the [SmokerOptions.linger](/api/midnight-smoker/midnight-smoker/interfaces/smokeresults/#linger) option is set to `true`, this method
will _not_ clean up the directories, but will instead emit a
[Lingered](Property Lingered: "Lingered") event.

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`void`\>

#### Todo

The specific cleanup mechanism should be moved to the package manager
  implementation.

#### Source

[packages/midnight-smoker/src/smoker.ts:289](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L289)

***

### getEnabledReporterDefs()

> **getEnabledReporterDefs**(): [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`ReporterDef`](/api/midnight-smoker/midnight-smoker/reporter/type-aliases/reporterdef/)\>[]

#### Returns

[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`ReporterDef`](/api/midnight-smoker/midnight-smoker/reporter/type-aliases/reporterdef/)\>[]

#### Source

[packages/midnight-smoker/src/smoker.ts:351](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L351)

***

### getPkgManagerDefs()

> **getPkgManagerDefs**(): [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<`Object`\>[]

#### Returns

[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<`Object`\>[]

#### Source

[packages/midnight-smoker/src/smoker.ts:267](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L267)

***

### getReporters()

> **getReporters**(): [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`ReporterDef`](/api/midnight-smoker/midnight-smoker/reporter/type-aliases/reporterdef/)\>[]

#### Returns

[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`ReporterDef`](/api/midnight-smoker/midnight-smoker/reporter/type-aliases/reporterdef/)\>[]

#### Source

[packages/midnight-smoker/src/smoker.ts:359](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L359)

***

### getRules()

> **getRules**(): [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`SomeRule`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/somerule/)\>[]

#### Returns

[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`SomeRule`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/somerule/)\>[]

#### Source

[packages/midnight-smoker/src/smoker.ts:365](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L365)

***

### install()

> **install**(`installManifests`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`[]\>

Installs from tarball in a temp dir

#### Parameters

• **installManifests**: [`PkgManagerInstallManifest`](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagerinstallmanifest/)[]

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`[]\>

#### Source

[packages/midnight-smoker/src/smoker.ts:372](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L372)

***

### lint()

> **lint**(): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`undefined` \| [`SmokeResults`](/api/midnight-smoker/midnight-smoker/interfaces/smokeresults/)\>

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`undefined` \| [`SmokeResults`](/api/midnight-smoker/midnight-smoker/interfaces/smokeresults/)\>

#### Source

[packages/midnight-smoker/src/smoker.ts:573](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L573)

***

### loadListeners()

> **loadListeners**(): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`void`\>

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`void`\>

#### Source

[packages/midnight-smoker/src/smoker.ts:397](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L397)

***

### pack()

> **pack**(): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PkgManagerInstallManifest`](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagerinstallmanifest/)[]\>

For each package manager, creates a tarball for one or more packages

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PkgManagerInstallManifest`](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagerinstallmanifest/)[]\>

#### Source

[packages/midnight-smoker/src/smoker.ts:446](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L446)

***

### runChecks()

> **runChecks**(`installResults`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

Runs automated checks against the installed packages

#### Parameters

• **installResults**: `Object`[]

The result of [Smoker.install](/api/midnight-smoker/midnight-smoker/classes/smoker/#install)

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

Result of running all enabled rules on all installed packages

> ##### issues
>
> > **issues**: [`RuleIssue`](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/)[]
>
> ##### passed
>
> > **passed**: `Object`[]
>

#### Source

[packages/midnight-smoker/src/smoker.ts:472](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L472)

***

### runScripts()

> **runScripts**(`installResults`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`[]\>

Runs the script for each package in `packItems`

#### Parameters

• **installResults**: `Object`[]

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`[]\>

#### Source

[packages/midnight-smoker/src/smoker.ts:519](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L519)

***

### smoke()

> **smoke**(): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`undefined` \| [`SmokeResults`](/api/midnight-smoker/midnight-smoker/interfaces/smokeresults/)\>

Pack, install, run checks (optionally), and run scripts (optionally)

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`undefined` \| [`SmokeResults`](/api/midnight-smoker/midnight-smoker/interfaces/smokeresults/)\>

Results

#### Source

[packages/midnight-smoker/src/smoker.ts:657](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L657)

***

### unloadListeners()

> **unloadListeners**(): `void`

#### Returns

`void`

#### Source

[packages/midnight-smoker/src/smoker.ts:686](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L686)

***

### create()

> **`static`** **create**(`this`, `opts`?): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Smoker`](/api/midnight-smoker/midnight-smoker/classes/smoker/)\>

Initializes a [Smoker](/api/midnight-smoker/midnight-smoker/classes/smoker/) instance.

#### Parameters

• **this**: `void`

• **opts?**: `Object`

• **opts\.add?**: `string` \| `string`[]= `undefined`

Add an extra package to the list of packages to be installed

• **opts\.all?**: `boolean`= `undefined`

Operate on all workspaces. The root workspace is omitted unless

• **opts\.bail?**: `boolean`= `undefined`

Fail on first script failure

• **opts\.executor?**: `string`= `undefined`

Component ID of Executor implementation

• **opts\.include-root?**: `undefined` \| `boolean`

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

• **opts\.pkg-manager?**: `undefined` \| `string` \| `string`[]

• **opts\.pkgManager?**: `string` \| `string`[]= `undefined`

The package manager(s) to use

• **opts\.plugin?**: `string` \| `string`[]= `undefined`

The plugin(s) to load

• **opts\.reporter?**: `string` \| `string`[]= `undefined`

The reporter(s) to use

• **opts\.rule-runner?**: `undefined` \| `string`

• **opts\.ruleRunner?**: `string`= `undefined`

The RuleRunners(s) to use

• **opts\.rules?**: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `undefined` \| `"error"` \| `Object` \| `"warn"` \| `"off"` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\> \| [`undefined` \| `"error"` \| `"warn"` \| `"off"`, `undefined` \| `Object` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>] \| `Object`\>= `undefined`

Rule config

• **opts\.script?**: `string` \| `string`[]= `undefined`

Script(s) to run.

• **opts\.script-runner?**: `undefined` \| `string`

• **opts\.scriptRunner?**: `string`= `undefined`

ScriptRunners(s) to use.

• **opts\.verbose?**: `boolean`= `undefined`

Verbose logging

• **opts\.workspace?**: `string` \| `string`[]= `undefined`

One or more workspaces to operate in

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Smoker`](/api/midnight-smoker/midnight-smoker/classes/smoker/)\>

#### Source

[packages/midnight-smoker/src/smoker.ts:193](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L193)

***

### createWithCapabilities()

> **`static`** **createWithCapabilities**(`this`, `opts`?, `caps`?): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Smoker`](/api/midnight-smoker/midnight-smoker/classes/smoker/)\>

Initializes a [Smoker](/api/midnight-smoker/midnight-smoker/classes/smoker/) instance with the provided capabilities.

This is intended to be used mainly for testing or interally. Generally, ou
will want to use [Smoker.create](/api/midnight-smoker/midnight-smoker/classes/smoker/#create) instead.

#### Parameters

• **this**: `void`

• **opts?**: `Object`

Raw Smoker options

• **opts\.add?**: `string` \| `string`[]= `undefined`

Add an extra package to the list of packages to be installed

• **opts\.all?**: `boolean`= `undefined`

Operate on all workspaces. The root workspace is omitted unless

• **opts\.bail?**: `boolean`= `undefined`

Fail on first script failure

• **opts\.executor?**: `string`= `undefined`

Component ID of Executor implementation

• **opts\.include-root?**: `undefined` \| `boolean`

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

• **opts\.pkg-manager?**: `undefined` \| `string` \| `string`[]

• **opts\.pkgManager?**: `string` \| `string`[]= `undefined`

The package manager(s) to use

• **opts\.plugin?**: `string` \| `string`[]= `undefined`

The plugin(s) to load

• **opts\.reporter?**: `string` \| `string`[]= `undefined`

The reporter(s) to use

• **opts\.rule-runner?**: `undefined` \| `string`

• **opts\.ruleRunner?**: `string`= `undefined`

The RuleRunners(s) to use

• **opts\.rules?**: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `undefined` \| `"error"` \| `Object` \| `"warn"` \| `"off"` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\> \| [`undefined` \| `"error"` \| `"warn"` \| `"off"`, `undefined` \| `Object` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>] \| `Object`\>= `undefined`

Rule config

• **opts\.script?**: `string` \| `string`[]= `undefined`

Script(s) to run.

• **opts\.script-runner?**: `undefined` \| `string`

• **opts\.scriptRunner?**: `string`= `undefined`

ScriptRunners(s) to use.

• **opts\.verbose?**: `boolean`= `undefined`

Verbose logging

• **opts\.workspace?**: `string` \| `string`[]= `undefined`

One or more workspaces to operate in

• **caps?**: [`SmokerCapabilities`](/api/midnight-smoker/midnight-smoker/interfaces/smokercapabilities/)= `{}`

Capabilities

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Smoker`](/api/midnight-smoker/midnight-smoker/classes/smoker/)\>

A new Smoker instance

#### Source

[packages/midnight-smoker/src/smoker.ts:208](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L208)

***

### getPkgManagerDefs()

> **`static`** **getPkgManagerDefs**(`this`, `opts`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<`Object`\>[]\>

#### Parameters

• **this**: `void`

• **opts**: `Object`= `{}`

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

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<`Object`\>[]\>

#### Source

[packages/midnight-smoker/src/smoker.ts:271](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L271)

***

### getPlugins()

> **`static`** **getPlugins**(`this`, `opts`?): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`StaticPluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/interfaces/staticpluginmetadata/)[]\>

#### Parameters

• **this**: `void`

• **opts?**: `Object`

• **opts\.add?**: `string` \| `string`[]= `undefined`

Add an extra package to the list of packages to be installed

• **opts\.all?**: `boolean`= `undefined`

Operate on all workspaces. The root workspace is omitted unless

• **opts\.bail?**: `boolean`= `undefined`

Fail on first script failure

• **opts\.executor?**: `string`= `undefined`

Component ID of Executor implementation

• **opts\.include-root?**: `undefined` \| `boolean`

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

• **opts\.pkg-manager?**: `undefined` \| `string` \| `string`[]

• **opts\.pkgManager?**: `string` \| `string`[]= `undefined`

The package manager(s) to use

• **opts\.plugin?**: `string` \| `string`[]= `undefined`

The plugin(s) to load

• **opts\.reporter?**: `string` \| `string`[]= `undefined`

The reporter(s) to use

• **opts\.rule-runner?**: `undefined` \| `string`

• **opts\.ruleRunner?**: `string`= `undefined`

The RuleRunners(s) to use

• **opts\.rules?**: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `undefined` \| `"error"` \| `Object` \| `"warn"` \| `"off"` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\> \| [`undefined` \| `"error"` \| `"warn"` \| `"off"`, `undefined` \| `Object` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>] \| `Object`\>= `undefined`

Rule config

• **opts\.script?**: `string` \| `string`[]= `undefined`

Script(s) to run.

• **opts\.script-runner?**: `undefined` \| `string`

• **opts\.scriptRunner?**: `string`= `undefined`

ScriptRunners(s) to use.

• **opts\.verbose?**: `boolean`= `undefined`

Verbose logging

• **opts\.workspace?**: `string` \| `string`[]= `undefined`

One or more workspaces to operate in

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`StaticPluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/interfaces/staticpluginmetadata/)[]\>

#### Source

[packages/midnight-smoker/src/smoker.ts:232](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L232)

***

### getReporters()

> **`static`** **getReporters**(`this`, `opts`?): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`ReporterDef`](/api/midnight-smoker/midnight-smoker/reporter/type-aliases/reporterdef/)\>[]\>

Initializes a [Smoker](/api/midnight-smoker/midnight-smoker/classes/smoker/) instance and returns a list of reporters.

#### Parameters

• **this**: `void`

• **opts?**: `Object`

Raw Smoker options (including `plugin`)

• **opts\.add?**: `string` \| `string`[]= `undefined`

Add an extra package to the list of packages to be installed

• **opts\.all?**: `boolean`= `undefined`

Operate on all workspaces. The root workspace is omitted unless

• **opts\.bail?**: `boolean`= `undefined`

Fail on first script failure

• **opts\.executor?**: `string`= `undefined`

Component ID of Executor implementation

• **opts\.include-root?**: `undefined` \| `boolean`

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

• **opts\.pkg-manager?**: `undefined` \| `string` \| `string`[]

• **opts\.pkgManager?**: `string` \| `string`[]= `undefined`

The package manager(s) to use

• **opts\.plugin?**: `string` \| `string`[]= `undefined`

The plugin(s) to load

• **opts\.reporter?**: `string` \| `string`[]= `undefined`

The reporter(s) to use

• **opts\.rule-runner?**: `undefined` \| `string`

• **opts\.ruleRunner?**: `string`= `undefined`

The RuleRunners(s) to use

• **opts\.rules?**: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `undefined` \| `"error"` \| `Object` \| `"warn"` \| `"off"` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\> \| [`undefined` \| `"error"` \| `"warn"` \| `"off"`, `undefined` \| `Object` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>] \| `Object`\>= `undefined`

Rule config

• **opts\.script?**: `string` \| `string`[]= `undefined`

Script(s) to run.

• **opts\.script-runner?**: `undefined` \| `string`

• **opts\.scriptRunner?**: `string`= `undefined`

ScriptRunners(s) to use.

• **opts\.verbose?**: `boolean`= `undefined`

Verbose logging

• **opts\.workspace?**: `string` \| `string`[]= `undefined`

One or more workspaces to operate in

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`ReporterDef`](/api/midnight-smoker/midnight-smoker/reporter/type-aliases/reporterdef/)\>[]\>

List of reporters

#### Source

[packages/midnight-smoker/src/smoker.ts:224](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L224)

***

### getRules()

> **`static`** **getRules**(`this`, `opts`?): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`SomeRule`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/somerule/)\>[]\>

Initializes a [Smoker](/api/midnight-smoker/midnight-smoker/classes/smoker/) instance and returns a list of rules.

#### Parameters

• **this**: `void`

• **opts?**: `Object`

Raw Smoker options (including `plugin`)

• **opts\.add?**: `string` \| `string`[]= `undefined`

Add an extra package to the list of packages to be installed

• **opts\.all?**: `boolean`= `undefined`

Operate on all workspaces. The root workspace is omitted unless

• **opts\.bail?**: `boolean`= `undefined`

Fail on first script failure

• **opts\.executor?**: `string`= `undefined`

Component ID of Executor implementation

• **opts\.include-root?**: `undefined` \| `boolean`

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

• **opts\.pkg-manager?**: `undefined` \| `string` \| `string`[]

• **opts\.pkgManager?**: `string` \| `string`[]= `undefined`

The package manager(s) to use

• **opts\.plugin?**: `string` \| `string`[]= `undefined`

The plugin(s) to load

• **opts\.reporter?**: `string` \| `string`[]= `undefined`

The reporter(s) to use

• **opts\.rule-runner?**: `undefined` \| `string`

• **opts\.ruleRunner?**: `string`= `undefined`

The RuleRunners(s) to use

• **opts\.rules?**: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `undefined` \| `"error"` \| `Object` \| `"warn"` \| `"off"` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\> \| [`undefined` \| `"error"` \| `"warn"` \| `"off"`, `undefined` \| `Object` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>] \| `Object`\>= `undefined`

Rule config

• **opts\.script?**: `string` \| `string`[]= `undefined`

Script(s) to run.

• **opts\.script-runner?**: `undefined` \| `string`

• **opts\.scriptRunner?**: `string`= `undefined`

ScriptRunners(s) to use.

• **opts\.verbose?**: `boolean`= `undefined`

Verbose logging

• **opts\.workspace?**: `string` \| `string`[]= `undefined`

One or more workspaces to operate in

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`SomeRule`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/somerule/)\>[]\>

List of rules

#### Source

[packages/midnight-smoker/src/smoker.ts:246](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L246)

***

### smoke()

> **`static`** **smoke**(`this`, `opts`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`undefined` \| [`SmokeResults`](/api/midnight-smoker/midnight-smoker/interfaces/smokeresults/)\>

Instantiate `Smoker` and immediately run.

#### Parameters

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

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`undefined` \| [`SmokeResults`](/api/midnight-smoker/midnight-smoker/interfaces/smokeresults/)\>

#### Source

[packages/midnight-smoker/src/smoker.ts:259](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/smoker.ts#L259)
