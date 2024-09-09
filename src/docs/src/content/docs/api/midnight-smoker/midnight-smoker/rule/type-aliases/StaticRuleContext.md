---
editUrl: false
next: false
prev: false
title: "StaticRuleContext"
---

> **StaticRuleContext**: `Object`

The bits of a [RuleContext](/api/midnight-smoker/midnight-smoker/rule/classes/rulecontext/) suitable for serialization.

## Type declaration

### installPath

> **installPath**: `string` = `zNonEmptyString`

### pkgJson

> **pkgJson**: `Object` & `Object` & `NodeJsStandard` & `PackageJsonStandard` & `NonStandardEntryPoints` & `TypeScriptConfiguration` & `YarnConfiguration` & `JSPMConfiguration` = `zPackageJson`

#### Type declaration

#### Type declaration

### pkgJsonPath

> **pkgJsonPath**: `string` = `zNonEmptyString`

### severity

> **severity**: `"error"` \| `"warn"` \| `"off"` = `zRuleSeverity`

## Source

[packages/midnight-smoker/src/component/rule/static.ts:21](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/rule/static.ts#L21)
