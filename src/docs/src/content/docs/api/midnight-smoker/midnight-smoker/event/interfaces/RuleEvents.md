---
editUrl: false
next: false
prev: false
title: "RuleEvents"
---

## Extended By

- [`SmokerEvents`](/api/midnight-smoker/midnight-smoker/event/interfaces/smokerevents/)

## Events

### RuleError

> **RuleError**: [`RuleError`](/api/midnight-smoker/midnight-smoker/rule-runner/classes/ruleerror/)

Emitted when a rule throws an exception or rejects a `Promise`.

An associated [RunRuleFailed](/api/midnight-smoker/midnight-smoker/event/interfaces/ruleevents/#runrulefailed) event will also be emitted immediately
thereafter.

This should _not_ cause `midnight-smoker` to crash _unless_ something other
than an `Error` is thrown within or rejected from the rule implementation.

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

#### Source

[packages/midnight-smoker/src/event/rule-events.ts:60](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/rule-events.ts#L60)
