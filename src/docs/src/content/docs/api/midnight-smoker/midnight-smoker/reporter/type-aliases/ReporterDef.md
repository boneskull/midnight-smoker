---
editUrl: false
next: false
prev: false
title: "ReporterDef"
---

> **ReporterDef**: `Object`

## Type declaration

### description

> **description**: `string`

### isReporter?

> **isReporter**?: `boolean`

### name

> **name**: `string`

### reporter

> **reporter**: [`ReporterFn`](/api/midnight-smoker/midnight-smoker/reporter/type-aliases/reporterfn/)

### stderr?

> **stderr**?: `NodeJS.WritableStream` \| () => `NodeJS.WritableStream` \| () => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`NodeJS.WritableStream`\>

### stdout?

> **stdout**?: `NodeJS.WritableStream` \| () => `NodeJS.WritableStream` \| () => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`NodeJS.WritableStream`\>

### when?

> **when**?: [`ReporterWhenFn`](/api/midnight-smoker/midnight-smoker/reporter/type-aliases/reporterwhenfn/)

## Source

[packages/midnight-smoker/src/component/reporter/reporter-types.ts:6](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/reporter/reporter-types.ts#L6)
