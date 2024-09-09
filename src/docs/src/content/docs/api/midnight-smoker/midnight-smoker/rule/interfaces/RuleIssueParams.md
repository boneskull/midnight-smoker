---
editUrl: false
next: false
prev: false
title: "RuleIssueParams"
---

Properties for a [RuleIssue](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/).

Accepted by [RuleIssue.create](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/#create)

## Type parameters

• **Ctx** extends [`StaticRuleContext`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/staticrulecontext/)

• **RuleDef** extends [`StaticRule`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/staticrule/)

## Properties

### context

> **context**: `Ctx`

The [StaticRuleContext](/api/midnight-smoker/midnight-smoker/rule/type-aliases/staticrulecontext/) for this issue, for public consumption.

#### Source

[packages/midnight-smoker/src/component/rule/issue.ts:27](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/issue.ts#L27)

***

### data?

> **data**?: `unknown`

Arbitrary data attached to the issue by the rule implementation

#### Source

[packages/midnight-smoker/src/component/rule/issue.ts:31](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/issue.ts#L31)

***

### error?

> **error**?: [`RuleError`](/api/midnight-smoker/midnight-smoker/rule-runner/classes/ruleerror/)

A [RuleError](/api/midnight-smoker/midnight-smoker/rule-runner/classes/ruleerror/) which was caught during the execution of the rule, if
any

#### Source

[packages/midnight-smoker/src/component/rule/issue.ts:36](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/issue.ts#L36)

***

### message

> **message**: `string`

The message for this issue

#### Source

[packages/midnight-smoker/src/component/rule/issue.ts:40](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/issue.ts#L40)

***

### rule

> **rule**: `RuleDef`

The serialized rule definition for this issue

#### Source

[packages/midnight-smoker/src/component/rule/issue.ts:44](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/issue.ts#L44)
