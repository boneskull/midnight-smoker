---
editUrl: false
next: false
prev: false
title: "NullPm"
---

## Implements

- [`PkgManager`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanager/)

## Constructors

### new NullPm(spec, executor, opts)

> **new NullPm**(`spec`?, `executor`?, `opts`?): [`NullPm`](/api/midnight-smoker/test-util/null-pkg-manager/classes/nullpm/)

#### Parameters

• **spec?**: [`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)

• **executor?**: [`Executor`](/api/midnight-smoker/midnight-smoker/executor/type-aliases/executor/)

• **opts?**: [`PkgManagerOpts`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/pkgmanageropts/)= `{}`

#### Returns

[`NullPm`](/api/midnight-smoker/test-util/null-pkg-manager/classes/nullpm/)

#### Source

[packages/test-util/src/null-pkg-manager.ts:32](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-pkg-manager.ts#L32)

## Properties

### executor?

> **executor**?: [`Executor`](/api/midnight-smoker/midnight-smoker/executor/type-aliases/executor/)

#### Source

[packages/test-util/src/null-pkg-manager.ts:34](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-pkg-manager.ts#L34)

***

### opts

> **opts**: [`PkgManagerOpts`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/pkgmanageropts/) = `{}`

#### Source

[packages/test-util/src/null-pkg-manager.ts:35](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-pkg-manager.ts#L35)

***

### path

> **`readonly`** **path**: `"/usr/bin/nullpm"` = `'/usr/bin/nullpm'`

#### Source

[packages/test-util/src/null-pkg-manager.ts:67](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-pkg-manager.ts#L67)

***

### spec

> **spec**: [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>

#### Implementation of

`PkgManager.spec`

#### Source

[packages/test-util/src/null-pkg-manager.ts:31](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-pkg-manager.ts#L31)

***

### tmpdir

> **`readonly`** **tmpdir**: `string` = `MOCK_TMPDIR`

#### Implementation of

`PkgManager.tmpdir`

#### Source

[packages/test-util/src/null-pkg-manager.ts:65](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-pkg-manager.ts#L65)

## Methods

### getBinPath()

> **getBinPath**(): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`string`\>

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`string`\>

#### Source

[packages/test-util/src/null-pkg-manager.ts:69](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-pkg-manager.ts#L69)

***

### getVersion()

> **getVersion**(): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`string`\>

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`string`\>

#### Source

[packages/test-util/src/null-pkg-manager.ts:73](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-pkg-manager.ts#L73)

***

### install()

> **install**(`installManifests`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

#### Parameters

• **installManifests**: [`InstallManifest`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/installmanifest/)[]

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

> ##### all?
>
> > **all**?: `string`
>
> ##### command
>
> > **command**: `string`
>
> ##### exitCode
>
> > **exitCode**: `number`
>
> ##### failed
>
> > **failed**: `boolean`
>
> ##### stderr
>
> > **stderr**: `string`
>
> ##### stdout
>
> > **stdout**: `string`
>

#### Implementation of

`PkgManager.install`

#### Source

[packages/test-util/src/null-pkg-manager.ts:45](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-pkg-manager.ts#L45)

***

### pack()

> **pack**(`opts`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`[]\>

#### Parameters

• **opts**: `Object`

• **opts\.allWorkspaces?**: `boolean`

• **opts\.includeWorkspaceRoot?**: `boolean`

• **opts\.workspaces?**: `string`[]

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`[]\>

#### Implementation of

`PkgManager.pack`

#### Source

[packages/test-util/src/null-pkg-manager.ts:55](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-pkg-manager.ts#L55)

***

### runScript()

> **runScript**(`runManifest`, `opts`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

#### Parameters

• **runManifest**: [`RunScriptManifest`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/runscriptmanifest/)

• **opts**: `undefined` \| `Object`

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

> ##### cwd?
>
> > **cwd**?: `string`
>
> ##### error?
>
> > **error**?: [`RunScriptError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/runscripterror/) \| [`UnknownScriptError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/unknownscripterror/) \| [`ScriptFailedError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/scriptfailederror/)
>
> ##### pkgName
>
> > **pkgName**: `string`
>
> ##### rawResult
>
> > **rawResult**: `Object` \| [`ExecError`](/api/midnight-smoker/midnight-smoker/executor/classes/execerror/) & `undefined` \| [`ExecError`](/api/midnight-smoker/midnight-smoker/executor/classes/execerror/) \| `Object`
>
> ##### script
>
> > **script**: `string`
>
> ##### skipped?
>
> > **skipped**?: `boolean`
>

#### Implementation of

`PkgManager.runScript`

#### Source

[packages/test-util/src/null-pkg-manager.ts:77](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-pkg-manager.ts#L77)
