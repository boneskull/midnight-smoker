---
editUrl: false
next: false
prev: false
title: "pickPackageVersion"
---

> **pickPackageVersion**(`installable`, `cwd`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`string`\>

Try to pick a version for a package to install.

Given an `installable` which is both a) a valid npm package name and b) has
no version specifier, determine the version to install.

If the `package.json` within `cwd` contains the package of the same name, we
will use that version; otherwise we will use the `latest` tag. If
`installable` is not a package name at all, it passes thru verbatim.

## Parameters

• **installable**: `string`

The `thing` in `npm install <thing>`

• **cwd**: `string`= `undefined`

Where the command would be run

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`string`\>

## Source

[packages/midnight-smoker/src/util/pkg-util.ts:244](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/pkg-util.ts#L244)
