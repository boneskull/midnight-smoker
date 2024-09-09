---
editUrl: false
next: false
prev: false
title: "RegistryLoadPackageManagersOpts"
---

Options for [loadPackageManagers]([object Object]).

## Extends

- [`LoadPackageManagersOpts`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/loadpackagemanagersopts/)

## Properties

### cwd?

> **cwd**?: `string`

Current working directory (where `smoker` is run)

#### Inherited from

[`midnight-smoker.midnight-smoker/pkg-manager.LoadPackageManagersOpts.cwd`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/loadpackagemanagersopts/#cwd)

#### Source

[packages/midnight-smoker/src/component/pkg-manager/loader.ts:28](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/loader.ts#L28)

***

### defaultExecutorId?

> **defaultExecutorId**?: `string`

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:710](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L710)

***

### desiredPkgManagers?

> **desiredPkgManagers**?: (`string` \| [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>)[]

List of desired package managers. If not provided, then
[loadPackageManagers]([object Object]) will guess what to use by analyzing the
filesystem.

#### Inherited from

[`midnight-smoker.midnight-smoker/pkg-manager.LoadPackageManagersOpts.desiredPkgManagers`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/loadpackagemanagersopts/#desiredpkgmanagers)

#### Source

[packages/midnight-smoker/src/component/pkg-manager/loader.ts:35](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/loader.ts#L35)

***

### loose?

> **loose**?: `boolean`

If `true`, ignore missing scripts

#### Inherited from

[`midnight-smoker.midnight-smoker/pkg-manager.LoadPackageManagersOpts.loose`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/loadpackagemanagersopts/#loose)

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-types.ts:22](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-types.ts#L22)

***

### systemExecutorId?

> **systemExecutorId**?: `string`

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:709](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L709)

***

### verbose?

> **verbose**?: `boolean`

If `true`, show STDERR/STDOUT from the package manager

#### Inherited from

[`midnight-smoker.midnight-smoker/pkg-manager.LoadPackageManagersOpts.verbose`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/loadpackagemanagersopts/#verbose)

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-types.ts:17](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-types.ts#L17)
