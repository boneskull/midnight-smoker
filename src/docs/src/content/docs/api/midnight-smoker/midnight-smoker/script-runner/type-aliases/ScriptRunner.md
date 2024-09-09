---
editUrl: false
next: false
prev: false
title: "ScriptRunner"
---

> **ScriptRunner**: (...`args`) => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

## Parameters

• ...**args**: [[`ScriptRunnerNotifiers`](/api/midnight-smoker/midnight-smoker/script-runner/interfaces/scriptrunnernotifiers/), [`PkgManagerRunScriptManifest`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/pkgmanagerrunscriptmanifest/), `Object`]

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

> ### cwd?
>
> > **cwd**?: `string`
>
> The directory in which the script ran.
>
> ### error?
>
> > **error**?: [`RunScriptError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/runscripterror/) \| [`ScriptFailedError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/scriptfailederror/) \| [`UnknownScriptError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/unknownscripterror/)
>
> The error if the script failed.
>
> ### pkgName
>
> > **pkgName**: `string`
>
> The name of the package in which the script ran.
>
> ### rawResult
>
> > **rawResult**: [`ExecError`](/api/midnight-smoker/midnight-smoker/executor/classes/execerror/) \| `Object` & `undefined` \| [`ExecError`](/api/midnight-smoker/midnight-smoker/executor/classes/execerror/) \| `Object`
>
> The raw result of running the script.
>
> ### script
>
> > **script**: `string`
>
> The name of the script that ran.
>
> ### skipped?
>
> > **skipped**?: `boolean`
>
> Whether the script was skipped.
>

## Source

[packages/midnight-smoker/src/component/script-runner/script-runner-schema.ts:107](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/script-runner/script-runner-schema.ts#L107)
