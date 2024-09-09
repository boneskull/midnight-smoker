---
editUrl: false
next: false
prev: false
title: "PkgManagerSpecOpts"
---

Options for [PkgManagerSpec](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/).

## Properties

### isSystem?

> **isSystem**?: `boolean`

If `true`, the `PkgManagerController` should treat this using the "system"
`Executor`

#### Default Value

`false`

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts:25](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts#L25)

***

### pkgManager?

> **pkgManager**?: `string`

The package manager executable name

#### Default Value

`npm`

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts:31](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts#L31)

***

### version?

> **version**?: `string` \| `SemVer`

The version or dist-tag of the requested package manager.

#### Default Value

`latest`

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts:37](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts#L37)
