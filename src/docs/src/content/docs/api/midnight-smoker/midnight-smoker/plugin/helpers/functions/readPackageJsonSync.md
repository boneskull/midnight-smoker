---
editUrl: false
next: false
prev: false
title: "readPackageJsonSync"
---

## readPackageJsonSync(opts)

> **readPackageJsonSync**(`opts`): `readPkgUp.ReadResult`

Reads closest `package.json` from some dir (synchronously)

### Parameters

• **opts**: [`ReadPackageJsonOpts`](/api/midnight-smoker/midnight-smoker/plugin/helpers/interfaces/readpackagejsonopts/) & `Object`

Options

### Returns

`readPkgUp.ReadResult`

Object with `packageJson` and `path` properties or `undefined` if
  not in `strict` mode

### Remarks

Use [readPackageJson](readPackageJson.md) instead if possible

### Source

[packages/midnight-smoker/src/util/pkg-util.ts:137](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/pkg-util.ts#L137)

## readPackageJsonSync(opts)

> **readPackageJsonSync**(`opts`?): `readPkgUp.ReadResult` \| `undefined`

### Parameters

• **opts?**: [`ReadPackageJsonOpts`](/api/midnight-smoker/midnight-smoker/plugin/helpers/interfaces/readpackagejsonopts/)

### Returns

`readPkgUp.ReadResult` \| `undefined`

### Source

[packages/midnight-smoker/src/util/pkg-util.ts:140](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/pkg-util.ts#L140)
