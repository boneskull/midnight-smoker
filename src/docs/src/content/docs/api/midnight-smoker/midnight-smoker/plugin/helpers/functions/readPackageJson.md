---
editUrl: false
next: false
prev: false
title: "readPackageJson"
---

## readPackageJson(opts)

> **readPackageJson**(`opts`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`ReadPackageJsonNormalizedResult`](/api/midnight-smoker/midnight-smoker/plugin/helpers/type-aliases/readpackagejsonnormalizedresult/)\>

Reads closest `package.json` from some dir

### Parameters

• **opts**: [`ReadPackageJsonOpts`](/api/midnight-smoker/midnight-smoker/plugin/helpers/interfaces/readpackagejsonopts/) & `Object`

Options

### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`ReadPackageJsonNormalizedResult`](/api/midnight-smoker/midnight-smoker/plugin/helpers/type-aliases/readpackagejsonnormalizedresult/)\>

Object with `packageJson` and `path` properties or `undefined` if
  not in `strict` mode

### Source

[packages/midnight-smoker/src/util/pkg-util.ts:79](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/pkg-util.ts#L79)

## readPackageJson(opts)

> **readPackageJson**(`opts`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`ReadPackageJsonResult`](/api/midnight-smoker/midnight-smoker/plugin/helpers/type-aliases/readpackagejsonresult/)\>

### Parameters

• **opts**: [`ReadPackageJsonOpts`](/api/midnight-smoker/midnight-smoker/plugin/helpers/interfaces/readpackagejsonopts/) & `Object`

### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`ReadPackageJsonResult`](/api/midnight-smoker/midnight-smoker/plugin/helpers/type-aliases/readpackagejsonresult/)\>

### Source

[packages/midnight-smoker/src/util/pkg-util.ts:82](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/pkg-util.ts#L82)

## readPackageJson(opts)

> **readPackageJson**(`opts`?): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`ReadPackageJsonResult`](/api/midnight-smoker/midnight-smoker/plugin/helpers/type-aliases/readpackagejsonresult/) \| `undefined`\>

### Parameters

• **opts?**: [`ReadPackageJsonOpts`](/api/midnight-smoker/midnight-smoker/plugin/helpers/interfaces/readpackagejsonopts/)

### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`ReadPackageJsonResult`](/api/midnight-smoker/midnight-smoker/plugin/helpers/type-aliases/readpackagejsonresult/) \| `undefined`\>

### Source

[packages/midnight-smoker/src/util/pkg-util.ts:85](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/pkg-util.ts#L85)

## readPackageJson(opts)

> **readPackageJson**(`opts`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`ReadPackageJsonNormalizedResult`](/api/midnight-smoker/midnight-smoker/plugin/helpers/type-aliases/readpackagejsonnormalizedresult/) \| `undefined`\>

### Parameters

• **opts**: [`ReadPackageJsonOpts`](/api/midnight-smoker/midnight-smoker/plugin/helpers/interfaces/readpackagejsonopts/) & `Object`

### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`ReadPackageJsonNormalizedResult`](/api/midnight-smoker/midnight-smoker/plugin/helpers/type-aliases/readpackagejsonnormalizedresult/) \| `undefined`\>

### Source

[packages/midnight-smoker/src/util/pkg-util.ts:88](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/util/pkg-util.ts#L88)
