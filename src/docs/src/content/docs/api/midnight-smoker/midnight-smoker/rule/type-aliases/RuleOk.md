---
editUrl: false
next: false
prev: false
title: "RuleOk"
---

> **RuleOk**: `Object`

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

## Source

[packages/midnight-smoker/src/component/rule/rule-result.ts:9](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/rule-result.ts#L9)
