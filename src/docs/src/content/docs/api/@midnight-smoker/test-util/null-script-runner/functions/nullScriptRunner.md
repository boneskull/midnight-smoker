---
editUrl: false
next: false
prev: false
title: "nullScriptRunner"
---

> **nullScriptRunner**(...`args`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

## Parameters

• ...**args**: [[`ScriptRunnerNotifiers`](/api/midnight-smoker/midnight-smoker/script-runner/interfaces/scriptrunnernotifiers/), [`PkgManagerRunScriptManifest`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/pkgmanagerrunscriptmanifest/), `Object`]

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

> ### cwd?
>
> > **cwd**?: `string`
>
> ### error?
>
> > **error**?: [`RunScriptError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/runscripterror/) \| [`UnknownScriptError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/unknownscripterror/) \| [`ScriptFailedError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/scriptfailederror/)
>
> ### pkgName
>
> > **pkgName**: `string`
>
> ### rawResult
>
> > **rawResult**: [`ExecError`](/api/midnight-smoker/midnight-smoker/executor/classes/execerror/) \| `Object` & `undefined` \| [`ExecError`](/api/midnight-smoker/midnight-smoker/executor/classes/execerror/) \| `Object`
>
> ### script
>
> > **script**: `string`
>
> ### skipped?
>
> > **skipped**?: `boolean`
>

## Source

[packages/test-util/src/null-script-runner.ts:7](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-script-runner.ts#L7)
