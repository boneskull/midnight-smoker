---
editUrl: false
next: false
prev: false
title: "nullRuleRunner"
---

> **nullRuleRunner**(...`args`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

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

[packages/test-util/src/null-rule-runner.ts:28](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-rule-runner.ts#L28)
