---
editUrl: false
next: false
prev: false
title: "PkgManagerDef"
---

> **PkgManagerDef**: `Object`

## Type declaration

### accepts

> **accepts**: `string` \| `Range` \| (...`args`) => `boolean` & `undefined` \| `string` \| `Range` \| (...`args`) => `boolean`

Either a SemVer range or a function which returns `true` if its parameter
is within the allowed range.

### bin

> **bin**: `string` = `zNonEmptyString`

The name of the package manager's executable.

### create

> **create**: (...`args`) => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\> = `zPkgManagerFactory`

Creates a [PkgManager](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanager/) object.

Creates a [PkgManager](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanager/) object.

#### Parameters

• ...**args**: [[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/), [`Executor`](/api/midnight-smoker/midnight-smoker/executor/type-aliases/executor/), [`midnight-smoker/plugin/helpers`](/api/midnight-smoker/midnight-smoker/plugin/helpers/index/), `undefined` \| `Object`]

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

> ##### install
>
> > **install**: [`PkgManagerInstallMethod`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanagerinstallmethod/) = `zPkgManagerInstallMethod`
>
> ##### pack
>
> > **pack**: [`PkgManagerPackMethod`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanagerpackmethod/) = `zPkgManagerPackMethod`
>
> ##### runScript
>
> > **runScript**: [`PkgManagerRunScriptMethod`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanagerrunscriptmethod/) = `zPkgManagerRunScriptMethod`
>
> ##### spec
>
> > **spec**: [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>
>
> ##### tmpdir
>
> > **tmpdir**: `string`
>

### lockfile?

> **lockfile**?: `string`

## Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts:306](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts#L306)
