---
editUrl: false
next: false
prev: false
title: "SmokerEvents"
---

Describes the data emitted by each event.

## Extends

- [`ScriptRunnerEvents`](/api/midnight-smoker/midnight-smoker/event/interfaces/scriptrunnerevents/).[`InstallEvents`](/api/midnight-smoker/midnight-smoker/event/interfaces/installevents/).[`PackEvents`](/api/midnight-smoker/midnight-smoker/event/interfaces/packevents/).[`RuleEvents`](/api/midnight-smoker/midnight-smoker/event/interfaces/ruleevents/)

## Events

### End

> **End**: `void`

Emitted after all other events have been emitted, and just before exit.

This implies that [SmokerEvents.UnknownError](/api/midnight-smoker/midnight-smoker/event/interfaces/smokerevents/#unknownerror) will _not_ be emitted if
it has not been emitted already.

#### Source

[packages/midnight-smoker/src/event/event-types.ts:27](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/event-types.ts#L27)

***

### InstallBegin

> **InstallBegin**: [`InstallEventData`](/api/midnight-smoker/midnight-smoker/event/interfaces/installeventdata/)

Emitted whenever a package is about to be installed (from a tarball) into
its temp directory.

Should happen once per package.

#### Inherited from

[`midnight-smoker.midnight-smoker/event.InstallEvents.InstallBegin`](/api/midnight-smoker/midnight-smoker/event/interfaces/installevents/#installbegin)

#### Source

[packages/midnight-smoker/src/event/install-events.ts:13](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L13)

***

### InstallFailed

> **InstallFailed**: [`InstallError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/installerror/)

Emitted when a package fails to install.

This is considered unrecoverable, and `midnight-smoker` will exit with a
non-zero code soon thereafter.

#### Inherited from

[`midnight-smoker.midnight-smoker/event.InstallEvents.InstallFailed`](/api/midnight-smoker/midnight-smoker/event/interfaces/installevents/#installfailed)

#### Source

[packages/midnight-smoker/src/event/install-events.ts:23](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L23)

***

### InstallOk

> **InstallOk**: [`InstallOkEventData`](/api/midnight-smoker/midnight-smoker/event/interfaces/installokeventdata/)

Emitted when a package is installed successfully from a tarball.

#### Inherited from

[`midnight-smoker.midnight-smoker/event.InstallEvents.InstallOk`](/api/midnight-smoker/midnight-smoker/event/interfaces/installevents/#installok)

#### Source

[packages/midnight-smoker/src/event/install-events.ts:30](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L30)

***

### Lingered

> **Lingered**: `string`[]

Emitted only if the `--linger` option was provided; a list of temp
directories used by `midnight-smoker` and left on disk at user behest.

#### Source

[packages/midnight-smoker/src/event/event-types.ts:35](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/event-types.ts#L35)

***

### PackBegin

> **PackBegin**: [`PackBeginEventData`](/api/midnight-smoker/midnight-smoker/event/interfaces/packbegineventdata/)

Emitted whenever a package is about to be packed into a tarball.

#### Inherited from

[`midnight-smoker.midnight-smoker/event.PackEvents.PackBegin`](/api/midnight-smoker/midnight-smoker/event/interfaces/packevents/#packbegin)

#### Source

[packages/midnight-smoker/src/event/pack-events.ts:10](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/pack-events.ts#L10)

***

### PackFailed

> **PackFailed**: [`PackError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/packerror/)

Emitted whenever packing a tarball fails.

This is considered unrecoverable, and `midnight-smoker` will exit with a
non-zero code soon thereafter.

#### Inherited from

[`midnight-smoker.midnight-smoker/event.PackEvents.PackFailed`](/api/midnight-smoker/midnight-smoker/event/interfaces/packevents/#packfailed)

#### Source

[packages/midnight-smoker/src/event/pack-events.ts:20](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/pack-events.ts#L20)

***

### PackOk

> **PackOk**: [`InstallEventData`](/api/midnight-smoker/midnight-smoker/event/interfaces/installeventdata/)

Emitted whenever a package is packed successfully into a tarball.

#### Inherited from

[`midnight-smoker.midnight-smoker/event.PackEvents.PackOk`](/api/midnight-smoker/midnight-smoker/event/interfaces/packevents/#packok)

#### Source

[packages/midnight-smoker/src/event/pack-events.ts:27](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/pack-events.ts#L27)

***

### RuleError

> **RuleError**: [`RuleError`](/api/midnight-smoker/midnight-smoker/rule-runner/classes/ruleerror/)

Emitted when a rule throws an exception or rejects a `Promise`.

An associated [RunRuleFailed](/api/midnight-smoker/midnight-smoker/event/interfaces/smokerevents/#runrulefailed) event will also be emitted immediately
thereafter.

This should _not_ cause `midnight-smoker` to crash _unless_ something other
than an `Error` is thrown within or rejected from the rule implementation.

#### Inherited from

[`midnight-smoker.midnight-smoker/event.RuleEvents.RuleError`](/api/midnight-smoker/midnight-smoker/event/interfaces/ruleevents/#ruleerror)

#### Source

[packages/midnight-smoker/src/event/rule-events.ts:73](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/rule-events.ts#L73)

***

### RunRuleBegin

> **RunRuleBegin**: `Object`

Emitted when a rule begins execution.

Emitted for each enabled rule for each package.

#### Type declaration

##### config

> **config**: `Object`

##### config.opts

> **config.opts**: `Object` & `Object`

###### Type declaration

###### Type declaration

##### config.severity

> **config.severity**: `"error"` \| `"warn"` \| `"off"` = `zRuleSeverity`

##### current

> **current**: `number`

##### installPath

> **installPath**: `string`

##### pkgName

> **pkgName**: `string`

##### rule

> **rule**: `string`

##### total

> **total**: `number`

#### Inherited from

[`midnight-smoker.midnight-smoker/event.RuleEvents.RunRuleBegin`](/api/midnight-smoker/midnight-smoker/event/interfaces/ruleevents/#runrulebegin)

#### Source

[packages/midnight-smoker/src/event/rule-events.ts:24](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/rule-events.ts#L24)

***

### RunRuleFailed

> **RunRuleFailed**: `Object`

Emitted whenever a rule creates a RuleIssue during execution.

#### Type declaration

##### config

> **config**: `Object`

##### config.opts

> **config.opts**: `Object` & `Object`

###### Type declaration

###### Type declaration

##### config.severity

> **config.severity**: `"error"` \| `"warn"` \| `"off"` = `zRuleSeverity`

##### current

> **current**: `number`

##### failed

> **failed**: `Object`[]

##### installPath

> **installPath**: `string`

##### pkgName

> **pkgName**: `string`

##### rule

> **rule**: `string`

##### total

> **total**: `number`

#### Inherited from

[`midnight-smoker.midnight-smoker/event.RuleEvents.RunRuleFailed`](/api/midnight-smoker/midnight-smoker/event/interfaces/ruleevents/#runrulefailed)

#### Source

[packages/midnight-smoker/src/event/rule-events.ts:31](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/rule-events.ts#L31)

***

### RunRuleOk

> **RunRuleOk**: `Object`

Emitted when a rule completes execution without raising a RuleIssue.

#### Type declaration

##### config

> **config**: `Object`

##### config.opts

> **config.opts**: `Object` & `Object`

###### Type declaration

###### Type declaration

##### config.severity

> **config.severity**: `"error"` \| `"warn"` \| `"off"` = `zRuleSeverity`

##### current

> **current**: `number`

##### installPath

> **installPath**: `string`

##### pkgName

> **pkgName**: `string`

##### rule

> **rule**: `string`

##### total

> **total**: `number`

#### Inherited from

[`midnight-smoker.midnight-smoker/event.RuleEvents.RunRuleOk`](/api/midnight-smoker/midnight-smoker/event/interfaces/ruleevents/#runruleok)

#### Source

[packages/midnight-smoker/src/event/rule-events.ts:38](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/rule-events.ts#L38)

***

### RunRulesBegin

> **RunRulesBegin**: `Object`

Emitted once before any rules are executed.

#### Type declaration

##### config

> **config**: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `Object`\>

##### total

> **total**: `number`

#### Inherited from

[`midnight-smoker.midnight-smoker/event.RuleEvents.RunRulesBegin`](/api/midnight-smoker/midnight-smoker/event/interfaces/ruleevents/#runrulesbegin)

#### Source

[packages/midnight-smoker/src/event/rule-events.ts:45](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/rule-events.ts#L45)

***

### RunRulesFailed

> **RunRulesFailed**: [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<`Object`\>

Emitted once when one or more rules have raised
RuleIssue RuleIssues.

#### Type declaration

##### config

> **config**: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `Object`\>

##### failed

> **failed**: `Object`[]

##### passed

> **passed**: `Object`[]

##### total

> **total**: `number`

#### Inherited from

[`midnight-smoker.midnight-smoker/event.RuleEvents.RunRulesFailed`](/api/midnight-smoker/midnight-smoker/event/interfaces/ruleevents/#runrulesfailed)

#### Source

[packages/midnight-smoker/src/event/rule-events.ts:53](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/rule-events.ts#L53)

***

### RunRulesOk

> **RunRulesOk**: [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<`Object`\>

Emitted once when _no_ rules have raised RuleIssue RuleIssues.

#### Type declaration

##### config

> **config**: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `Object`\>

##### passed

> **passed**: `Object`[]

##### total

> **total**: `number`

#### Inherited from

[`midnight-smoker.midnight-smoker/event.RuleEvents.RunRulesOk`](/api/midnight-smoker/midnight-smoker/event/interfaces/ruleevents/#runrulesok)

#### Source

[packages/midnight-smoker/src/event/rule-events.ts:60](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/rule-events.ts#L60)

***

### RunScriptBegin

> **RunScriptBegin**: `Object`

Emitted just before a custom script is about to be run in a package's temp
directory (post-[InstallOk](/api/midnight-smoker/midnight-smoker/event/interfaces/smokerevents/#installok))

#### Type declaration

##### current?

> **current**?: `number`

##### pkgName

> **pkgName**: `string`

##### script

> **script**: `string`

##### total?

> **total**?: `number`

#### Inherited from

[`midnight-smoker.midnight-smoker/event.ScriptRunnerEvents.RunScriptBegin`](/api/midnight-smoker/midnight-smoker/event/interfaces/scriptrunnerevents/#runscriptbegin)

#### Source

[packages/midnight-smoker/src/component/script-runner/script-runner-events.ts:16](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/script-runner/script-runner-events.ts#L16)

***

### RunScriptFailed

> **RunScriptFailed**: `Object`

Emitted whenever a custom script (run as in [RunScriptBegin](/api/midnight-smoker/midnight-smoker/event/interfaces/smokerevents/#runscriptbegin)) exits
with a non-zero exit code.

This is _not_ an unrecoverable error.

#### Type declaration

##### current?

> **current**?: `number`

##### error

> **error**: [`RunScriptError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/runscripterror/) \| [`ScriptFailedError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/scriptfailederror/) \| [`UnknownScriptError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/unknownscripterror/) & `undefined` \| [`RunScriptError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/runscripterror/) \| [`ScriptFailedError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/scriptfailederror/) \| [`UnknownScriptError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/unknownscripterror/)

##### pkgName

> **pkgName**: `string`

##### script

> **script**: `string`

##### total?

> **total**?: `number`

#### Inherited from

[`midnight-smoker.midnight-smoker/event.ScriptRunnerEvents.RunScriptFailed`](/api/midnight-smoker/midnight-smoker/event/interfaces/scriptrunnerevents/#runscriptfailed)

#### Source

[packages/midnight-smoker/src/component/script-runner/script-runner-events.ts:26](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/script-runner/script-runner-events.ts#L26)

***

### RunScriptOk

> **RunScriptOk**: `Object`

Emitted whenever a custom script runs successfully for a package.

#### Type declaration

##### current?

> **current**?: `number`

##### pkgName

> **pkgName**: `string`

##### script

> **script**: `string`

##### total?

> **total**?: `number`

#### Inherited from

[`midnight-smoker.midnight-smoker/event.ScriptRunnerEvents.RunScriptOk`](/api/midnight-smoker/midnight-smoker/event/interfaces/scriptrunnerevents/#runscriptok)

#### Source

[packages/midnight-smoker/src/component/script-runner/script-runner-events.ts:33](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/script-runner/script-runner-events.ts#L33)

***

### RunScriptsBegin

> **RunScriptsBegin**: `Object`

Emitted once after the "checks" phase is complete (if enabled) and just
before custom scripts are about to run.

#### Type declaration

##### manifest

> **manifest**: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, [`RunScriptManifest`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/runscriptmanifest/)[]\>

##### total

> **total**: `number`

#### Inherited from

[`midnight-smoker.midnight-smoker/event.ScriptRunnerEvents.RunScriptsBegin`](/api/midnight-smoker/midnight-smoker/event/interfaces/scriptrunnerevents/#runscriptsbegin)

#### Source

[packages/midnight-smoker/src/component/script-runner/script-runner-events.ts:41](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/script-runner/script-runner-events.ts#L41)

***

### RunScriptsFailed

> **RunScriptsFailed**: `Object`

Emitted once after all custom scripts have run and at least one has failed.

#### Type declaration

##### failed

> **failed**: `number`

##### manifest

> **manifest**: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, [`RunScriptManifest`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/runscriptmanifest/)[]\>

##### passed

> **passed**: `number`

##### results

> **results**: `Object`[]

##### total

> **total**: `number`

#### Inherited from

[`midnight-smoker.midnight-smoker/event.ScriptRunnerEvents.RunScriptsFailed`](/api/midnight-smoker/midnight-smoker/event/interfaces/scriptrunnerevents/#runscriptsfailed)

#### Source

[packages/midnight-smoker/src/component/script-runner/script-runner-events.ts:48](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/script-runner/script-runner-events.ts#L48)

***

### RunScriptsOk

> **RunScriptsOk**: `Object`

Emitted once after all custom scripts have run and all were successful.

#### Type declaration

##### failed

> **failed**: `number`

##### manifest

> **manifest**: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, [`RunScriptManifest`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/runscriptmanifest/)[]\>

##### passed

> **passed**: `number`

##### results

> **results**: `Object`[]

##### total

> **total**: `number`

#### Inherited from

[`midnight-smoker.midnight-smoker/event.ScriptRunnerEvents.RunScriptsOk`](/api/midnight-smoker/midnight-smoker/event/interfaces/scriptrunnerevents/#runscriptsok)

#### Source

[packages/midnight-smoker/src/component/script-runner/script-runner-events.ts:55](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/script-runner/script-runner-events.ts#L55)

***

### SmokeBegin

> **SmokeBegin**: [`SmokeBeginEventData`](/api/midnight-smoker/midnight-smoker/event/interfaces/smokebegineventdata/)

Emitted just before the initial "pack" phase begins.

#### Source

[packages/midnight-smoker/src/event/event-types.ts:42](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/event-types.ts#L42)

***

### SmokeFailed

> **SmokeFailed**: [`SmokeFailedError`](/api/midnight-smoker/midnight-smoker/errors/classes/smokefailederror/)\<[`SmokeResults`](/api/midnight-smoker/midnight-smoker/interfaces/smokeresults/)\>

Emitted at the end of execution if any script or automated check failed.

#### Source

[packages/midnight-smoker/src/event/event-types.ts:49](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/event-types.ts#L49)

***

### SmokeOk

> **SmokeOk**: [`SmokeResults`](/api/midnight-smoker/midnight-smoker/interfaces/smokeresults/)

Emitted at the end of execution if no script or automated check failed.

#### Source

[packages/midnight-smoker/src/event/event-types.ts:56](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/event-types.ts#L56)

***

### UnknownError

> **UnknownError**: [`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error )

Emitted if `smoker.smoke()` rejects, which should not happen under normal
operation.

I think.

#### Source

[packages/midnight-smoker/src/event/event-types.ts:66](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/event-types.ts#L66)
