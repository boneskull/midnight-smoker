---
editUrl: false
next: false
prev: false
title: "NullPkgManagerController"
---

## Extends

- [`PkgManagerController`](/api/midnight-smoker/midnight-smoker/classes/pkgmanagercontroller/)

## Constructors

### new NullPkgManagerController(pluginRegistry, desiredPkgManagers, opts)

> **new NullPkgManagerController**(`pluginRegistry`, `desiredPkgManagers`, `opts`?): [`NullPkgManagerController`](/api/midnight-smoker/test-util/null-controller/classes/nullpkgmanagercontroller/)

#### Parameters

• **pluginRegistry**: [`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)

• **desiredPkgManagers**: `string` \| readonly `string`[]

• **opts?**: [`PkgManagerControllerOpts`](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagercontrolleropts/)

#### Returns

[`NullPkgManagerController`](/api/midnight-smoker/test-util/null-controller/classes/nullpkgmanagercontroller/)

#### Inherited from

[`midnight-smoker.midnight-smoker.PkgManagerController.constructor`](/api/midnight-smoker/midnight-smoker/classes/pkgmanagercontroller/#constructors)

#### Source

packages/midnight-smoker/dist/controller/controller.d.ts:15

## Properties

### defaultExecutorId

> **`protected`** **`readonly`** **defaultExecutorId**: `string`

#### Inherited from

[`midnight-smoker.midnight-smoker.PkgManagerController.defaultExecutorId`](/api/midnight-smoker/midnight-smoker/classes/pkgmanagercontroller/#defaultexecutorid)

#### Source

packages/midnight-smoker/dist/controller/controller.d.ts:13

***

### desiredPkgManagers

> **`protected`** **`readonly`** **desiredPkgManagers**: `string` \| readonly `string`[]

#### Inherited from

[`midnight-smoker.midnight-smoker.PkgManagerController.desiredPkgManagers`](/api/midnight-smoker/midnight-smoker/classes/pkgmanagercontroller/#desiredpkgmanagers)

#### Source

packages/midnight-smoker/dist/controller/controller.d.ts:11

***

### opts

> **`protected`** **`readonly`** **opts**: [`PkgManagerControllerOpts`](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagercontrolleropts/)

#### Inherited from

[`midnight-smoker.midnight-smoker.PkgManagerController.opts`](/api/midnight-smoker/midnight-smoker/classes/pkgmanagercontroller/#opts)

#### Source

packages/midnight-smoker/dist/controller/controller.d.ts:12

***

### pluginRegistry

> **`protected`** **`readonly`** **pluginRegistry**: [`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)

#### Inherited from

[`midnight-smoker.midnight-smoker.PkgManagerController.pluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pkgmanagercontroller/#pluginregistry)

#### Source

packages/midnight-smoker/dist/controller/controller.d.ts:10

***

### systemExecutorId

> **`protected`** **`readonly`** **systemExecutorId**: `string`

#### Inherited from

[`midnight-smoker.midnight-smoker.PkgManagerController.systemExecutorId`](/api/midnight-smoker/midnight-smoker/classes/pkgmanagercontroller/#systemexecutorid)

#### Source

packages/midnight-smoker/dist/controller/controller.d.ts:14

## Methods

### getPkgManagers()

> **getPkgManagers**(): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<readonly `Object`[]\>

Returns no package managers.

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<readonly `Object`[]\>

Empty array

#### Overrides

[`midnight-smoker.midnight-smoker.PkgManagerController.getPkgManagers`](/api/midnight-smoker/midnight-smoker/classes/pkgmanagercontroller/#abstract-getpkgmanagers)

#### Source

[packages/test-util/src/null-controller.ts:28](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-controller.ts#L28)

***

### install()

> **install**(`installManifests`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`[]\>

Installs nothing

#### Parameters

• **installManifests**: [`PkgManagerInstallManifest`](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagerinstallmanifest/)[]

Install manifests

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`[]\>

Empty array

#### Overrides

[`midnight-smoker.midnight-smoker.PkgManagerController.install`](/api/midnight-smoker/midnight-smoker/classes/pkgmanagercontroller/#abstract-install)

#### Source

[packages/test-util/src/null-controller.ts:38](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-controller.ts#L38)

***

### pack()

> **pack**(): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PkgManagerInstallManifest`](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagerinstallmanifest/)[]\>

Packs nothing

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PkgManagerInstallManifest`](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagerinstallmanifest/)[]\>

Empty array

#### Overrides

[`midnight-smoker.midnight-smoker.PkgManagerController.pack`](/api/midnight-smoker/midnight-smoker/classes/pkgmanagercontroller/#abstract-pack)

#### Source

[packages/test-util/src/null-controller.ts:49](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-controller.ts#L49)

***

### runScripts()

> **runScripts**(`scripts`, `installResults`, `opts`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`[]\>

Runs no custom scripts

#### Parameters

• **scripts**: `string`[]

Scripts to (not) run

• **installResults**: `Object`[]

Results of (not) installing

• **opts**: [`PkgManagerControllerRunScriptsOpts`](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagercontrollerrunscriptsopts/)

Options (unused)

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`[]\>

Empty array

#### Overrides

[`midnight-smoker.midnight-smoker.PkgManagerController.runScripts`](/api/midnight-smoker/midnight-smoker/classes/pkgmanagercontroller/#abstract-runscripts)

#### Source

[packages/test-util/src/null-controller.ts:61](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-controller.ts#L61)
