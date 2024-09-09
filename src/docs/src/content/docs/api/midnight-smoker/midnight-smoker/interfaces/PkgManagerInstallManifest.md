---
editUrl: false
next: false
prev: false
title: "PkgManagerInstallManifest"
---

Describes which packages to install and where to install them.

This is returned by [PkgManager.pack](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagerinstallmanifest/#pack) and passed to
[PkgManager.install](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagerinstallmanifest/#install).

## Extends

- [`InstallManifest`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/installmanifest/)

## Properties

### cwd

> **cwd**: `string`

The directory in which to install the package.

This is the temp directory unique to the [PkgManager](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanager/) and package.

#### Inherited from

[`midnight-smoker.midnight-smoker/pkg-manager.InstallManifest.cwd`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/installmanifest/#cwd)

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts:113](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts#L113)

***

### installPath?

> **installPath**?: `string`

The directory in which the package should be installed.

[PkgManager.pack](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagerinstallmanifest/#pack) leaves this empty and [PkgManager.install](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagerinstallmanifest/#install)
fills it in.

#### Inherited from

[`midnight-smoker.midnight-smoker/pkg-manager.InstallManifest.installPath`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/installmanifest/#installpath)

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts:121](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts#L121)

***

### isAdditional?

> **isAdditional**?: `boolean`

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts:248](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts#L248)

***

### pkgManager

> **pkgManager**: `Object`

#### Type declaration

##### install

> **install**: [`PkgManagerInstallMethod`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanagerinstallmethod/) = `zPkgManagerInstallMethod`

##### pack

> **pack**: [`PkgManagerPackMethod`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanagerpackmethod/) = `zPkgManagerPackMethod`

##### runScript

> **runScript**: [`PkgManagerRunScriptMethod`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanagerrunscriptmethod/) = `zPkgManagerRunScriptMethod`

##### spec

> **spec**: [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>

##### tmpdir

> **tmpdir**: `string`

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts:249](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts#L249)

***

### pkgName

> **pkgName**: `string`

The name of the package to install.

#### Inherited from

[`midnight-smoker.midnight-smoker/pkg-manager.InstallManifest.pkgName`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/installmanifest/#pkgname)

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts:126](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts#L126)

***

### spec

> **spec**: `string`

Could be a tarball path or any other package spec understood by the package
manager.

#### Inherited from

[`midnight-smoker.midnight-smoker/pkg-manager.InstallManifest.spec`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/installmanifest/#spec)

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts:132](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts#L132)
