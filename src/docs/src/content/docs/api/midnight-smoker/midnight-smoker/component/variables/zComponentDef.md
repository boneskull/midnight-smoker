---
editUrl: false
next: false
prev: false
title: "zComponentDef"
---

> **`const`** **zComponentDef**: `ZodObject`\<`Object`, `"strip"`, `ZodTypeAny`, `Object`, `Object`\>

## Type declaration

### kind

> **kind**: `ZodNativeEnum`\<`Object`\>

#### Type declaration

##### Executor

> **`readonly`** **Executor**: `"Executor"` = `'Executor'`

##### PkgManagerDef

> **`readonly`** **PkgManagerDef**: `"PkgManagerDef"` = `'PkgManagerDef'`

##### Reporter

> **`readonly`** **Reporter**: `"Reporter"` = `'Reporter'`

##### Rule

> **`readonly`** **Rule**: `"Rule"` = `'Rule'`

##### RuleRunner

> **`readonly`** **RuleRunner**: `"RuleRunner"` = `'RuleRunner'`

##### ScriptRunner

> **`readonly`** **ScriptRunner**: `"ScriptRunner"` = `'ScriptRunner'`

### name

> **name**: `ZodString` = `zNonEmptyString`

### owner

> **owner**: `ZodObject`\<`Object`, `"strip"`, `ZodTypeAny`, `Object`, `Object`\> = `zOwner`

#### Type declaration

##### id

> **id**: `ZodString` = `zNonEmptyString`

### value

> **value**: `ZodType`\<`object`, `ZodTypeDef`, `object`\> = `zComponentizable`

## Source

[packages/midnight-smoker/src/component/component/component.ts:137](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/component/component.ts#L137)
