---
editUrl: false
next: false
prev: false
title: "execSmoker"
---

## execSmoker(args, opts)

> **execSmoker**(`args`, `opts`?): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`ExecResult`](/api/midnight-smoker/midnight-smoker/executor/type-aliases/execresult/)\>

Execute `smoker` with the given `args` and `opts` using execa.node.

### Parameters

• **args**: `string`[]

Args to `smoker`

• **opts?**: [`ExecSmokerOpts`](/api/midnight-smoker/test-util/e2e/interfaces/execsmokeropts/)

Options, mostly for `execa`

### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`ExecResult`](/api/midnight-smoker/midnight-smoker/executor/type-aliases/execresult/)\>

Result of running the `smoker` executable

### See

[https://npm.im/execa](https://npm.im/execa)

### Source

[packages/test-util/src/e2e.ts:34](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/e2e.ts#L34)

## execSmoker(args, opts)

> **execSmoker**(`args`, `opts`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`unknown`\>

Execute `smoker`, but parse the result as JSON.

If `smoker` exits with a non-zero exit code or otherwise fails, the result
will be parsed as JSON and returned. The only way for this to reject would be
if parsing JSON fails.

### Parameters

• **args**: `string`[]

Args to `smoker`

• **opts**: `Object`

Options, mostly for `execa`, but must have `json: true`

• **opts\.json**: `true`

### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`unknown`\>

The `stdout` of the `smoker` execution, parsed as JSON

### See

[https://npm.im/execa](https://npm.im/execa)

### Source

[packages/test-util/src/e2e.ts:51](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/e2e.ts#L51)
