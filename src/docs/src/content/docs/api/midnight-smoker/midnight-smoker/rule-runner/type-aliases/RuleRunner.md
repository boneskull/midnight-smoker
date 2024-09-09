---
editUrl: false
next: false
prev: false
title: "RuleRunner"
---

> **RuleRunner**: (...`args`) => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

## Todo

A RuleRunner should not need to return anything, since it operates
  solely by mutating `RuleContext` objects. This means get rid of the
  `RuleOk` schema, since we won't need it. `RuleOk` should be needed only for
  defining the `RunRuleOk` and/or `RunRulesOk` events. It may turn out that
  it is needed by these events, as I know there are some schemas for them--I
  just don't know why that'd be necessary (because I am too lazy to look
  right now)

## Parameters

• ...**args**: [[`RuleRunnerNotifiers`](/api/midnight-smoker/midnight-smoker/rule-runner/interfaces/rulerunnernotifiers/), [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`Rule`](/api/midnight-smoker/midnight-smoker/rule/classes/rule/)\<`string`, `void` \| [`RuleOptionSchema`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/ruleoptionschema/)\<`UnknownKeysParam`\>\>\>[], [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `Object`\>, `Object`[]]

## Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

> ### issues
>
> > **issues**: [`RuleIssue`](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/)[]
>
> ### passed
>
> > **passed**: `Object`[]
>

## Source

[packages/midnight-smoker/src/component/rule-runner/rule-runner-schema.ts:154](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule-runner/rule-runner-schema.ts#L154)
