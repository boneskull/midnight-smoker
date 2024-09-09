---
editUrl: false
next: false
prev: false
title: "fixupOutput"
---

> **fixupOutput**(`str`, `stripPmVersions`): `string`

Strips a bunch of nondeterministic info from CLI output so that we can take a
snapshot of it.

## Parameters

• **str**: `string`

String of CLI output; usually either `stdout` or `stderr`

• **stripPmVersions**: `boolean`= `true`

If true, replace `version` in
  `(npm|yarn|pnpm)@<version>` with the string `<version>`.

## Returns

`string`

Fixed output

## Source

[packages/test-util/src/e2e.ts:100](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/e2e.ts#L100)
