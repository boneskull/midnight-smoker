---
editUrl: false
next: false
prev: false
title: "PackEvent"
---

> **`const`** **PackEvent**: `Object`

## Type declaration

### PackBegin

> **`readonly`** **PackBegin**: `"PackBegin"` = `'PackBegin'`

Emitted whenever a package is about to be packed into a tarball.

### PackFailed

> **`readonly`** **PackFailed**: `"PackFailed"` = `'PackFailed'`

Emitted whenever packing a tarball fails.

This is considered unrecoverable, and `midnight-smoker` will exit with a
non-zero code soon thereafter.

### PackOk

> **`readonly`** **PackOk**: `"PackOk"` = `'PackOk'`

Emitted whenever a package is packed successfully into a tarball.

## Source

[packages/midnight-smoker/src/event/event-constants.ts:18](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/event-constants.ts#L18)
