---
editUrl: false
next: false
prev: false
title: "PkgManagerSpec"
---

This represents a specification for a requested package manager.

Where possible, dist-tags are normalized to version numbers. When this can be
done, a [SemVer]([object Object]) object is created, and the [PkgManagerSpec](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/) is
[considered valid](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/#isvalid).

## Constructors

### new PkgManagerSpec(opts)

> **new PkgManagerSpec**(`opts`): [`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)

This constructor will attempt to [normalizeVersion normalize]([object Object]) any
dist-tag provided.

If `pkgManager` is known and `version` is not a valid semantic version, it
is treated as a dist-tag. If that dist-tag is _not_ known, then this will
throw.

#### Parameters

• **opts**: [`PkgManagerSpecOpts`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/pkgmanagerspecopts/)= `{}`

Options for the package manager specification

#### Returns

[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts:77](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts#L77)

## Properties

### isSystem

> **`readonly`** **isSystem**: `boolean`

If `true`, the `PkgManagerController` should treat this using the "system"
`Executor`.

If this is `true`, the [version](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/#version) will be used
only for display purposes (it is informational for the user).

Also, see [PkgManagerSpec.toString](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/#tostring) for how the display differs.

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts:57](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts#L57)

***

### pkgManager

> **`readonly`** **pkgManager**: `string`

The package manager executable name

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts:61](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts#L61)

***

### version

> **`readonly`** **version**: `string`

The version or dist-tag of the requested package manager.

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts:65](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts#L65)

## Accessors

### isValid

> **`get`** **isValid**(): `boolean`

This returns `true` if the version is valid semantic version.

#### Returns

`boolean`

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts:100](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts#L100)

***

### semver

> **`get`** **semver**(): `undefined` \| `SemVer`

Returns a [SemVer]([object Object]) object if the version is valid, or `undefined`
otherwise

#### Returns

`undefined` \| `SemVer`

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts:108](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts#L108)

## Methods

### clone()

> **clone**(`opts`): [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>

#### Parameters

• **opts**: [`PkgManagerSpecOpts`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/pkgmanagerspecopts/)= `{}`

#### Returns

[`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts:198](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts#L198)

***

### toJSON()

> **toJSON**(): [`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)

#### Returns

[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts:202](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts#L202)

***

### toString()

> **toString**(): `string`

#### Returns

`string`

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts:206](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts#L206)

***

### create()

> **`static`** **create**(`__namedParameters`): [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>

#### Parameters

• **\_\_namedParameters**: [`PkgManagerSpecOpts`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/pkgmanagerspecopts/)= `{}`

#### Returns

[`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts:112](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts#L112)

***

### from()

#### from(this, spec, isSystem)

> **`static`** **from**(`this`, `spec`?, `isSystem`?): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>\>

Given a normalizable spec-style string (`foo@bar`) or a
[PkgManagerSpec](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/), resolves a new [PkgManagerSpec](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/).

If `spec` is a [PkgManagerSpec](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/), returns a
[clone](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/#clone).

##### Parameters

• **this**: `void`

• **spec?**: `string` \| [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>

A [PkgManagerSpec](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/) or a normalizable spec-style string

• **isSystem?**: `boolean`

If `true`, set the
  [isSystem](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/#issystem) flag.

##### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>\>

A new [PkgManagerSpec](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)

##### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts:135](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts#L135)

#### from(this, opts)

> **`static`** **from**(`this`, `opts`?): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>\>

Given a [PkgManagerSpecOpts](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/pkgmanagerspecopts/), resolves a new [PkgManagerSpec](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/).

##### Parameters

• **this**: `void`

• **opts?**: [`PkgManagerSpecOpts`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/pkgmanagerspecopts/)

Options for the package manager specification

##### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>\>

A new [PkgManagerSpec](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)

##### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts:147](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts#L147)

***

### parse()

> **`static`** **parse**(`spec`): `undefined` \| [`string`, `string`]

#### Parameters

• **spec**: `string`

#### Returns

`undefined` \| [`string`, `string`]

#### Source

[packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts:187](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/pkg-manager/pkg-manager-spec.ts#L187)
