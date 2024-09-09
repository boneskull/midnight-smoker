---
editUrl: false
next: false
prev: false
title: "PkgManagerController"
---

## Extends

- `TypeRecord`\<`EventEmitter`, [`PkgManagerEvents`](/api/midnight-smoker/midnight-smoker/type-aliases/pkgmanagerevents/), [`PkgManagerEvents`](/api/midnight-smoker/midnight-smoker/type-aliases/pkgmanagerevents/), `this`\> & [`Pick`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys )\<`EventEmitter`, `"off"` \| *typeof* `captureRejectionSymbol` \| `"removeAllListeners"` \| `"setMaxListeners"` \| `"getMaxListeners"` \| `"listeners"` \| `"rawListeners"` \| `"listenerCount"` \| `"prependListener"` \| `"prependOnceListener"` \| `"eventNames"`\> & [`Pick`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#picktype-keys )\<`OverriddenMethods`\<`EventEmitter`, [`PkgManagerEvents`](/api/midnight-smoker/midnight-smoker/type-aliases/pkgmanagerevents/), [`PkgManagerEvents`](/api/midnight-smoker/midnight-smoker/type-aliases/pkgmanagerevents/)\>, `"on"` \| `"once"` \| `"emit"` \| `"addListener"` \| `"removeListener"`\>

## Constructors

### new PkgManagerController(pluginRegistry, desiredPkgManagers, opts)

> **new PkgManagerController**(`pluginRegistry`, `desiredPkgManagers`, `opts`): [`PkgManagerController`](/api/midnight-smoker/midnight-smoker/classes/pkgmanagercontroller/)

#### Parameters

• **pluginRegistry**: [`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)

• **desiredPkgManagers**: `string` \| readonly `string`[]

• **opts**: [`PkgManagerControllerOpts`](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagercontrolleropts/)= `{}`

#### Returns

[`PkgManagerController`](/api/midnight-smoker/midnight-smoker/classes/pkgmanagercontroller/)

#### Overrides

`createStrictEmitter<PkgManagerEvents>().constructor`

#### Source

[packages/midnight-smoker/src/controller/controller.ts:23](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/controller/controller.ts#L23)

## Properties

### defaultExecutorId

> **`protected`** **`readonly`** **defaultExecutorId**: `string`

#### Source

[packages/midnight-smoker/src/controller/controller.ts:19](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/controller/controller.ts#L19)

***

### desiredPkgManagers

> **`protected`** **`readonly`** **desiredPkgManagers**: `string` \| readonly `string`[]

#### Source

[packages/midnight-smoker/src/controller/controller.ts:25](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/controller/controller.ts#L25)

***

### opts

> **`protected`** **`readonly`** **opts**: [`PkgManagerControllerOpts`](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagercontrolleropts/) = `{}`

#### Source

[packages/midnight-smoker/src/controller/controller.ts:26](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/controller/controller.ts#L26)

***

### pluginRegistry

> **`protected`** **`readonly`** **pluginRegistry**: [`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)

#### Source

[packages/midnight-smoker/src/controller/controller.ts:24](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/controller/controller.ts#L24)

***

### systemExecutorId

> **`protected`** **`readonly`** **systemExecutorId**: `string`

#### Source

[packages/midnight-smoker/src/controller/controller.ts:21](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/controller/controller.ts#L21)

## Methods

### `abstract` getPkgManagers()

> **`abstract`** **getPkgManagers**(): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<readonly `Object`[]\>

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<readonly `Object`[]\>

#### Source

[packages/midnight-smoker/src/controller/controller.ts:34](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/controller/controller.ts#L34)

***

### `abstract` install()

> **`abstract`** **install**(`installManifests`, `additionalDeps`?): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`[]\>

#### Parameters

• **installManifests**: [`PkgManagerInstallManifest`](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagerinstallmanifest/)[]

• **additionalDeps?**: `string`[]

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`[]\>

#### Source

[packages/midnight-smoker/src/controller/controller.ts:36](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/controller/controller.ts#L36)

***

### `abstract` pack()

> **`abstract`** **pack**(`opts`?): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PkgManagerInstallManifest`](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagerinstallmanifest/)[]\>

#### Parameters

• **opts?**: `Object`

• **opts\.allWorkspaces?**: `boolean`= `undefined`

• **opts\.includeWorkspaceRoot?**: `boolean`= `undefined`

• **opts\.workspaces?**: `string`[]= `undefined`

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PkgManagerInstallManifest`](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagerinstallmanifest/)[]\>

#### Source

[packages/midnight-smoker/src/controller/controller.ts:41](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/controller/controller.ts#L41)

***

### `abstract` runScripts()

> **`abstract`** **runScripts**(`scripts`, `installResults`, `opts`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`[]\>

#### Parameters

• **scripts**: `string`[]

• **installResults**: `Object`[]

• **opts**: [`PkgManagerControllerRunScriptsOpts`](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagercontrollerrunscriptsopts/)

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`[]\>

#### Source

[packages/midnight-smoker/src/controller/controller.ts:45](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/controller/controller.ts#L45)
