---
editUrl: false
next: false
prev: false
title: "RunScriptEvent"
---

> **`const`** **RunScriptEvent**: `Object`

## Type declaration

### RunScriptBegin

> **`readonly`** **RunScriptBegin**: `"RunScriptBegin"` = `'RunScriptBegin'`

Emitted just before a custom script is about to be run in a package's temp
directory (post-InstallOk)

### RunScriptFailed

> **`readonly`** **RunScriptFailed**: `"RunScriptFailed"` = `'RunScriptFailed'`

Emitted whenever a custom script (run as in [RunScriptBegin](Property RunScriptBegin: "RunScriptBegin")) exits
with a non-zero exit code.

This is _not_ an unrecoverable error.

### RunScriptOk

> **`readonly`** **RunScriptOk**: `"RunScriptOk"` = `'RunScriptOk'`

Emitted whenever a custom script runs successfully for a package.

### RunScriptsBegin

> **`readonly`** **RunScriptsBegin**: `"RunScriptsBegin"` = `'RunScriptsBegin'`

Emitted once after the "checks" phase is complete (if enabled) and just
before custom scripts are about to run.

### RunScriptsFailed

> **`readonly`** **RunScriptsFailed**: `"RunScriptsFailed"` = `'RunScriptsFailed'`

Emitted once after all custom scripts have run and at least one has failed.

### RunScriptsOk

> **`readonly`** **RunScriptsOk**: `"RunScriptsOk"` = `'RunScriptsOk'`

Emitted once after all custom scripts have run and all were successful.

## Source

[packages/midnight-smoker/src/event/event-constants.ts:35](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/event-constants.ts#L35)
