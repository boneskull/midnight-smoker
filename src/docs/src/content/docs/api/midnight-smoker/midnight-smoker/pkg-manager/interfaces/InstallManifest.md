---
editUrl: false
next: false
prev: false
title: "InstallManifest"
---

Describes which packages to install and where to install them.

This is returned by [PkgManager.pack](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagerinstallmanifest/#pack) and passed to
[PkgManager.install](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagerinstallmanifest/#install).

## Extended By

- [`PkgManagerInstallManifest`](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagerinstallmanifest/)

## Properties

### cwd

> **cwd**: `string`

The directory in which to install the package.

This is the temp directory unique to the [PkgManager](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanager/) and package.

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts:113](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts#L113)

***

### installPath?

> **installPath**?: `string`

The directory in which the package should be installed.

[PkgManager.pack](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagerinstallmanifest/#pack) leaves this empty and [PkgManager.install](/api/midnight-smoker/midnight-smoker/interfaces/pkgmanagerinstallmanifest/#install)
fills it in.

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts:121](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts#L121)

***

### pkgName

> **pkgName**: `string`

The name of the package to install.

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts:126](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts#L126)

***

### spec

> **spec**: `string`

Could be a tarball path or any other package spec understood by the package
manager.

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts:132](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts#L132)
