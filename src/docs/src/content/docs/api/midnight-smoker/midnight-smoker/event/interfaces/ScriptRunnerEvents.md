---
editUrl: false
next: false
prev: false
title: "ScriptRunnerEvents"
---

## Extended By

- [`SmokerEvents`](/api/midnight-smoker/midnight-smoker/event/interfaces/smokerevents/)

## Events

### RunScriptBegin

> **RunScriptBegin**: `Object`

Emitted just before a custom script is about to be run in a package's temp
directory (post-InstallOk)

#### Type declaration

##### current?

> **current**?: `number`

##### pkgName

> **pkgName**: `string`

##### script

> **script**: `string`

##### total?

> **total**?: `number`

#### Source

[packages/midnight-smoker/src/component/script-runner/script-runner-events.ts:16](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/script-runner/script-runner-events.ts#L16)

***

### RunScriptFailed

> **RunScriptFailed**: `Object`

Emitted whenever a custom script (run as in [RunScriptBegin](/api/midnight-smoker/midnight-smoker/event/interfaces/scriptrunnerevents/#runscriptbegin)) exits
with a non-zero exit code.

This is _not_ an unrecoverable error.

#### Type declaration

##### current?

> **current**?: `number`

##### error

> **error**: [`RunScriptError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/runscripterror/) \| [`ScriptFailedError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/scriptfailederror/) \| [`UnknownScriptError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/unknownscripterror/) & `undefined` \| [`RunScriptError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/runscripterror/) \| [`ScriptFailedError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/scriptfailederror/) \| [`UnknownScriptError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/unknownscripterror/)

##### pkgName

> **pkgName**: `string`

##### script

> **script**: `string`

##### total?

> **total**?: `number`

#### Source

[packages/midnight-smoker/src/component/script-runner/script-runner-events.ts:26](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/script-runner/script-runner-events.ts#L26)

***

### RunScriptOk

> **RunScriptOk**: `Object`

Emitted whenever a custom script runs successfully for a package.

#### Type declaration

##### current?

> **current**?: `number`

##### pkgName

> **pkgName**: `string`

##### script

> **script**: `string`

##### total?

> **total**?: `number`

#### Source

[packages/midnight-smoker/src/component/script-runner/script-runner-events.ts:33](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/script-runner/script-runner-events.ts#L33)

***

### RunScriptsBegin

> **RunScriptsBegin**: `Object`

Emitted once after the "checks" phase is complete (if enabled) and just
before custom scripts are about to run.

#### Type declaration

##### manifest

> **manifest**: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, [`RunScriptManifest`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/runscriptmanifest/)[]\>

##### total

> **total**: `number`

#### Source

[packages/midnight-smoker/src/component/script-runner/script-runner-events.ts:41](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/script-runner/script-runner-events.ts#L41)

***

### RunScriptsFailed

> **RunScriptsFailed**: `Object`

Emitted once after all custom scripts have run and at least one has failed.

#### Type declaration

##### failed

> **failed**: `number`

##### manifest

> **manifest**: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, [`RunScriptManifest`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/runscriptmanifest/)[]\>

##### passed

> **passed**: `number`

##### results

> **results**: `Object`[]

##### total

> **total**: `number`

#### Source

[packages/midnight-smoker/src/component/script-runner/script-runner-events.ts:48](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/script-runner/script-runner-events.ts#L48)

***

### RunScriptsOk

> **RunScriptsOk**: `Object`

Emitted once after all custom scripts have run and all were successful.

#### Type declaration

##### failed

> **failed**: `number`

##### manifest

> **manifest**: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, [`RunScriptManifest`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/runscriptmanifest/)[]\>

##### passed

> **passed**: `number`

##### results

> **results**: `Object`[]

##### total

> **total**: `number`

#### Source

[packages/midnight-smoker/src/component/script-runner/script-runner-events.ts:55](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/script-runner/script-runner-events.ts#L55)
