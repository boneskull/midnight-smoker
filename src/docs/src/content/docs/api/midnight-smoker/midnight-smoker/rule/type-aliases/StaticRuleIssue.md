---
editUrl: false
next: false
prev: false
title: "StaticRuleIssue"
---

> **StaticRuleIssue**: `Object`

Represents a static rule issue, which is a [RuleIssue](/api/midnight-smoker/midnight-smoker/rule/classes/ruleissue/) in a serializable
format

## Type declaration

### context

> **context**: `Object` = `zStaticRuleContext`

### context.installPath

> **context.installPath**: `string` = `zNonEmptyString`

### context.pkgJson

> **context.pkgJson**: `Object` & `Object` & `NodeJsStandard` & `PackageJsonStandard` & `NonStandardEntryPoints` & `TypeScriptConfiguration` & `YarnConfiguration` & `JSPMConfiguration` = `zPackageJson`

#### Type declaration

#### Type declaration

### context.pkgJsonPath

> **context.pkgJsonPath**: `string` = `zNonEmptyString`

### context.severity

> **context.severity**: `"error"` \| `"warn"` \| `"off"` = `zRuleSeverity`

### data?

> **data**?: `unknown`

### error?

> **error**?: [`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error )

### failed

> **failed**: `boolean`

### id

> **id**: `string`

### message

> **message**: `string`

### rule

> **rule**: `Object` = `zStaticRule`

### rule.defaultSeverity?

> **rule.defaultSeverity**?: `"error"` \| `"warn"` \| `"off"`

### rule.description

> **rule.description**: `string`

### rule.name

> **rule.name**: `string` = `zNonEmptyString`

### rule.url?

> **rule.url**?: `string`

### severity

> **severity**: `"error"` \| `"warn"` \| `"off"`

## Source

[packages/midnight-smoker/src/component/rule/issue.ts:186](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/issue.ts#L186)
