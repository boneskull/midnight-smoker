---
editUrl: false
next: false
prev: false
title: "SmokerEvent"
---

> **`const`** **SmokerEvent**: `Object`

Enum-like containing constants for all [SmokerEvents](/api/midnight-smoker/midnight-smoker/event/interfaces/smokerevents/).

## Type declaration

### End

> **`readonly`** **End**: `"End"` = `'End'`

Emitted after all other events have been emitted, and just before exit.

This implies that [SmokerEvents.UnknownError](/api/midnight-smoker/midnight-smoker/event/interfaces/smokerevents/#unknownerror) will _not_ be emitted if
it has not been emitted already.

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

### Lingered

> **`readonly`** **Lingered**: `"Lingered"` = `'Lingered'`

Emitted only if the `--linger` option was provided; a list of temp
directories used by `midnight-smoker` and left on disk at user behest.

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

### RuleError

> **`readonly`** **RuleError**: `"RuleError"` = `'RuleError'`

Emitted when a rule throws an exception or rejects a `Promise`.

An associated [RunRuleFailed](Property RunRuleFailed: "RunRuleFailed") event will also be emitted immediately
thereafter.

This should _not_ cause `midnight-smoker` to crash _unless_ something other
than an `Error` is thrown within or rejected from the rule implementation.

### RunRuleBegin

> **`readonly`** **RunRuleBegin**: `"RunRuleBegin"` = `'RunRuleBegin'`

Emitted when a rule begins execution.

Emitted for each enabled rule for each package.

### RunRuleFailed

> **`readonly`** **RunRuleFailed**: `"RunRuleFailed"` = `'RunRuleFailed'`

Emitted whenever a rule creates a RuleIssue during execution.

### RunRuleOk

> **`readonly`** **RunRuleOk**: `"RunRuleOk"` = `'RunRuleOk'`

Emitted when a rule completes execution without raising a RuleIssue.

### RunRulesBegin

> **`readonly`** **RunRulesBegin**: `"RunRulesBegin"` = `'RunRulesBegin'`

Emitted once before any rules are executed.

### RunRulesFailed

> **`readonly`** **RunRulesFailed**: `"RunRulesFailed"` = `'RunRulesFailed'`

Emitted once when one or more rules have raised
RuleIssue RuleIssues.

### RunRulesOk

> **`readonly`** **RunRulesOk**: `"RunRulesOk"` = `'RunRulesOk'`

Emitted once when _no_ rules have raised RuleIssue RuleIssues.

### RunScriptBegin

> **`readonly`** **RunScriptBegin**: `"RunScriptBegin"` = `'RunScriptBegin'`

Emitted just before a custom script is about to be run in a package's temp
directory (post-[InstallOk](Property InstallOk: "InstallOk"))

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

### SmokeBegin

> **`readonly`** **SmokeBegin**: `"SmokeBegin"` = `'SmokeBegin'`

Emitted just before the initial "pack" phase begins.

### SmokeFailed

> **`readonly`** **SmokeFailed**: `"SmokeFailed"` = `'SmokeFailed'`

Emitted at the end of execution if any script or automated check failed.

### SmokeOk

> **`readonly`** **SmokeOk**: `"SmokeOk"` = `'SmokeOk'`

Emitted at the end of execution if no script or automated check failed.

### UnknownError

> **`readonly`** **UnknownError**: `"UnknownError"` = `'UnknownError'`

Emitted if `smoker.smoke()` rejects, which should not happen under normal
operation.

I think.

## Source

[packages/midnight-smoker/src/event/event-constants.ts:107](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/event-constants.ts#L107)
