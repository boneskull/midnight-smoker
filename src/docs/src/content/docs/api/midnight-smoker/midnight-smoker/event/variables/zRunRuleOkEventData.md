---
editUrl: false
next: false
prev: false
title: "zRunRuleOkEventData"
---

> **`const`** **zRunRuleOkEventData**: `ZodObject`\<`Object`, `"strip"`, `ZodTypeAny`, `Object`, `Object`\> = `zRunRuleEventData`

## Type declaration

### config

> **config**: `ZodObject`\<`Object`, `"strict"`, `ZodTypeAny`, `Object`, `Object`\>

#### Type declaration

##### opts

> **opts**: `ZodObject`\<`Object`, `"passthrough"`, `ZodTypeAny`, `objectOutputType`\<`Object`, `ZodTypeAny`, `"passthrough"`\>, `objectInputType`\<`Object`, `ZodTypeAny`, `"passthrough"`\>\>

###### Type declaration

##### severity

> **severity**: `ZodNativeEnum`\<`Object`\> = `zRuleSeverity`

###### Type declaration

###### Error

> **`readonly`** **Error**: `"error"` = `'error'`

###### Off

> **`readonly`** **Off**: `"off"` = `'off'`

###### Warn

> **`readonly`** **Warn**: `"warn"` = `'warn'`

### current

> **current**: `ZodNumber`

### installPath

> **installPath**: `ZodString`

### pkgName

> **pkgName**: `ZodString`

### rule

> **rule**: `ZodString`

### total

> **total**: `ZodNumber`

## Source

[packages/midnight-smoker/src/event/rule-events.ts:110](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/rule-events.ts#L110)
