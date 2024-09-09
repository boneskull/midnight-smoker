---
editUrl: false
next: false
prev: false
title: "findPackageManagers"
---

> **findPackageManagers**(`pkgManagerDefs`, `pkgManagerSpecs`): [`Map`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/), [`PkgManagerDef`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanagerdef/)\>

Finds package managers based on the provided package manager modules and
specifications.

## Parameters

• **pkgManagerDefs**: `Object`[]

An array of package manager modules.

• **pkgManagerSpecs**: [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>[]

An array of package manager specifications.

## Returns

[`Map`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/), [`PkgManagerDef`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanagerdef/)\>

A map of package manager specs to their corresponding package
  manager modules.

## Throws

`UnsupportedPackageManagerError` if no package manager is found that
  can handle the specified name and version.

## Todo

I forget why I made this a separate function. Clue to self: I thought I
  wanted it in the tests for some reason.

## Todo

Remove hardcoded package manager names; replace with whatever
  normalizeVersion has access to

## Source

[packages/midnight-smoker/src/component/pkg-manager/loader.ts:138](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/loader.ts#L138)
