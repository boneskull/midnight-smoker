---
editUrl: false
next: false
prev: false
title: "LoadPackageManagersOpts"
---

Options for [loadPackageManagers]([object Object]).

## Extends

- [`PkgManagerOpts`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/pkgmanageropts/)

## Properties

### cwd?

> **cwd**?: `string`

Current working directory (where `smoker` is run)

#### Source

[packages/midnight-smoker/src/component/pkg-manager/loader.ts:28](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/loader.ts#L28)

***

### desiredPkgManagers?

> **desiredPkgManagers**?: (`string` \| [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>)[]

List of desired package managers. If not provided, then
[loadPackageManagers]([object Object]) will guess what to use by analyzing the
filesystem.

#### Source

[packages/midnight-smoker/src/component/pkg-manager/loader.ts:35](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/loader.ts#L35)

***

### loose?

> **loose**?: `boolean`

If `true`, ignore missing scripts

#### Inherited from

[`midnight-smoker.midnight-smoker/pkg-manager.PkgManagerOpts.loose`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/pkgmanageropts/#loose)

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-types.ts:22](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-types.ts#L22)

***

### verbose?

> **verbose**?: `boolean`

If `true`, show STDERR/STDOUT from the package manager

#### Inherited from

[`midnight-smoker.midnight-smoker/pkg-manager.PkgManagerOpts.verbose`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/pkgmanageropts/#verbose)

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-types.ts:17](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-types.ts#L17)
