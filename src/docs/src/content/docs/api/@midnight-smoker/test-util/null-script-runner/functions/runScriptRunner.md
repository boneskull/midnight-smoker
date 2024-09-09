---
editUrl: false
next: false
prev: false
title: "runScriptRunner"
---

> **runScriptRunner**(`scriptRunner`, `brokerRunManifest`, `opts`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`[]\>

Execute a script runner against one or more
[SR.PkgManagerRunScriptManifest](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/pkgmanagerrunscriptmanifest/) objects.

This will emit events on a provided
[emitter](/api/midnight-smoker/test-util/null-script-runner/interfaces/runscriptrunneropts/#emitter).

## Parameters

• **scriptRunner**: (...`args`) => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

• **brokerRunManifest**: [`PkgManagerRunScriptManifest`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/pkgmanagerrunscriptmanifest/) \| [`PkgManagerRunScriptManifest`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/pkgmanagerrunscriptmanifest/)[]

• **opts**: [`RunScriptRunnerOpts`](/api/midnight-smoker/test-util/null-script-runner/interfaces/runscriptrunneropts/)= `{}`

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`[]\>

## Source

[packages/test-util/src/null-script-runner.ts:68](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-script-runner.ts#L68)
