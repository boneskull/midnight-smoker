---
editUrl: false
next: false
prev: false
title: "runRuleRunner"
---

> **runRuleRunner**(`ruleRunner`, `registry`, `manifest`, `opts`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`RunRulesResult`](/api/midnight-smoker/midnight-smoker/rule-runner/type-aliases/runrulesresult/)\>

Runs the provided rule runner with the given manifest and options.

The [RuleRunner](/api/midnight-smoker/midnight-smoker/rule-runner/type-aliases/rulerunner/) _and_ the rules must be registered with the provided
[PluginRegistry](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/).

## Parameters

• **ruleRunner**: (...`args`) => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

The rule runner function to execute.

• **registry**: [`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)

Plugin registry.

• **manifest**: `Object`[]

The manifest containing information about the rules to run.

• **opts**: [`RunRuleRunnerOpts`](/api/midnight-smoker/test-util/null-rule-runner/interfaces/runrulerunneropts/)= `{}`

The optional configuration options for running the rule runner.

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`RunRulesResult`](/api/midnight-smoker/midnight-smoker/rule-runner/type-aliases/runrulesresult/)\>

A promise that resolves when the rule runner has completed.

## Source

[packages/test-util/src/null-rule-runner.ts:132](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-rule-runner.ts#L132)
