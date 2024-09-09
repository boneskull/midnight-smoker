---
editUrl: false
next: false
prev: false
title: "zBasePkgManagerInstallManifest"
---

> **`const`** **zBasePkgManagerInstallManifest**: `ZodObject`\<`Object`, `"strip"`, `ZodTypeAny`, `Object`, `Object`\>

## Type declaration

### cwd

> **cwd**: `ZodString`

### installPath

> **installPath**: `ZodOptional`\<`ZodString`\>

### isAdditional

> **isAdditional**: `ZodOptional`\<`ZodBoolean`\>

### pkgManager

> **pkgManager**: `ZodObject`\<`Object`, `"strip"`, `ZodTypeAny`, `Object`, `Object`\> = `zPackageManager`

#### Type declaration

##### install

> **install**: `ZodType`\<[`PkgManagerInstallMethod`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanagerinstallmethod/), `ZodTypeDef`, [`PkgManagerInstallMethod`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanagerinstallmethod/)\> = `zPkgManagerInstallMethod`

##### pack

> **pack**: `ZodType`\<[`PkgManagerPackMethod`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanagerpackmethod/), `ZodTypeDef`, [`PkgManagerPackMethod`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanagerpackmethod/)\> = `zPkgManagerPackMethod`

##### runScript

> **runScript**: `ZodType`\<[`PkgManagerRunScriptMethod`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanagerrunscriptmethod/), `ZodTypeDef`, [`PkgManagerRunScriptMethod`](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanagerrunscriptmethod/)\> = `zPkgManagerRunScriptMethod`

##### spec

> **spec**: `ZodReadonly`\<`ZodType`\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/), `ZodTypeDef`, [`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>\>

##### tmpdir

> **tmpdir**: `ZodReadonly`\<`ZodString`\>

### pkgName

> **pkgName**: `ZodString`

### spec

> **spec**: `ZodString`

## Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts:225](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-schema.ts#L225)
