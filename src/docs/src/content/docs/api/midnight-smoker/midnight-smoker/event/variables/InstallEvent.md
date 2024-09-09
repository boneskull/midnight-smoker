---
editUrl: false
next: false
prev: false
title: "InstallEvent"
---

> **`const`** **InstallEvent**: `Object`

## Type declaration

### InstallBegin

> **`readonly`** **InstallBegin**: `"InstallBegin"` = `'InstallBegin'`

Emitted whenever a package is about to be installed (from a tarball) into
its temp directory.

Should happen once per package.

### InstallFailed

> **`readonly`** **InstallFailed**: `"InstallFailed"` = `'InstallFailed'`

Emitted when a package fails to install.

This is considered unrecoverable, and `midnight-smoker` will exit with a
non-zero code soon thereafter.

### InstallOk

> **`readonly`** **InstallOk**: `"InstallOk"` = `'InstallOk'`

Emitted when a package is installed successfully from a tarball.

## Source

[packages/midnight-smoker/src/event/event-constants.ts:1](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/event-constants.ts#L1)
