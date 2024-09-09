---
editUrl: false
next: false
prev: false
title: "RuleEvent"
---

> **`const`** **RuleEvent**: `Object`

## Type declaration

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

## Source

[packages/midnight-smoker/src/event/event-constants.ts:67](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/event-constants.ts#L67)
