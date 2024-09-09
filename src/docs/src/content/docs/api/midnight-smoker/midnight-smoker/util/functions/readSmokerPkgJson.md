---
editUrl: false
next: false
prev: false
title: "readSmokerPkgJson"
---

> **readSmokerPkgJson**(): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`PackageJson`\>

Reads `midnight-smoker`'s own `package.json`

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`PackageJson`\>

## Remarks

We cannot read it directly because it's outside of TS' `rootDir`. If we were
to change the `rootDir`, then the path would be wrong at runtime.

## Source

[packages/midnight-smoker/src/util/pkg-util.ts:165](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/pkg-util.ts#L165)
