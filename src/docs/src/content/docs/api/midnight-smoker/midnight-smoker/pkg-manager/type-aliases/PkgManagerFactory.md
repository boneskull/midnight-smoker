---
editUrl: false
next: false
prev: false
title: "PkgManagerFactory"
---

> **PkgManagerFactory**: (...`args`) => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

## Parameters

• ...**args**: [[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/), [`Executor`](/api/midnight-smoker/midnight-smoker/executor/type-aliases/executor/), [`midnight-smoker/plugin/helpers`](/api/midnight-smoker/midnight-smoker/plugin/helpers/index/), `undefined` \| `Object`]

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

> ### install
>
> > **install**: [`PkgManagerInstallMethod`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanagerinstallmethod/) = `zPkgManagerInstallMethod`
>
> ### pack
>
> > **pack**: [`PkgManagerPackMethod`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanagerpackmethod/) = `zPkgManagerPackMethod`
>
> ### runScript
>
> > **runScript**: [`PkgManagerRunScriptMethod`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanagerrunscriptmethod/) = `zPkgManagerRunScriptMethod`
>
> ### spec
>
> > **spec**: [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>
>
> ### tmpdir
>
> > **tmpdir**: `string`
>

## Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts:304](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts#L304)
