---
editUrl: false
next: false
prev: false
title: "RunScriptResult"
---

> **RunScriptResult**: `Object`

Describes the result of running a custom script.

The contents of this object describe whether the script failed (and how) or
not.

## See

[zRunScriptResult](../variables/zRunScriptResult.md)

## Type declaration

### cwd?

> **cwd**?: `string`

The directory in which the script ran.

### error?

> **error**?: [`RunScriptError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/runscripterror/) \| [`ScriptFailedError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/scriptfailederror/) \| [`UnknownScriptError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/unknownscripterror/)

The error if the script failed.

### pkgName

> **pkgName**: `string`

The name of the package in which the script ran.

### rawResult

> **rawResult**: [`ExecError`](/api/midnight-smoker/midnight-smoker/executor/classes/execerror/) \| `Object` & `undefined` \| [`ExecError`](/api/midnight-smoker/midnight-smoker/executor/classes/execerror/) \| `Object`

The raw result of running the script.

### script

> **script**: `string`

The name of the script that ran.

### skipped?

> **skipped**?: `boolean`

Whether the script was skipped.

## Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts:83](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts#L83)
