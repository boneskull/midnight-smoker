---
editUrl: false
next: false
prev: false
title: "fromUnknownError"
---

> **fromUnknownError**(`err`): [`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error )

Converts something that was thrown to an `Error` instance, if not already.

## Parameters

• **err**: `unknown`

A thrown thing

## Returns

[`Error`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error )

The original thing (if an `Error`) otherwise a new `Error`

## Source

[packages/midnight-smoker/src/error/base-error.ts:193](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/error/base-error.ts#L193)
