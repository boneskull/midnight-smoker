---
editUrl: false
next: false
prev: false
title: "justImport"
---

> **justImport**(`moduleId`, `pkgJson`?): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`unknown`\>

Attempts to gracefully load an unknown module.

`await import()` on a CJS module will always return an object with a
`default` export. Modules which have been, say, compiled with TS into CJS and
_also_ have a default export will be wrapped in _another_ `default` property.
That sucks, but it can be avoided by just `require`-ing the CJS module
instead. We will still need to unwrap the `default` property if it exists.

The `pkgJson` parameter is used to help us guess at the type of module we're
importing.

## Parameters

• **moduleId**: `string`

Resolved module identifier

• **pkgJson?**: `PackageJson`

`package.json` associated with the module, if any

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`unknown`\>

Hopefully, whatever is exported

## Source

[packages/midnight-smoker/src/util/loader-util.ts:82](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/loader-util.ts#L82)
