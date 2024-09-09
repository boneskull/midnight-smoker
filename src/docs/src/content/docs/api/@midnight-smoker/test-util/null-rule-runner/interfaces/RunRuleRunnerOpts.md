---
editUrl: false
next: false
prev: false
title: "RunRuleRunnerOpts"
---

Options for running a rule runner.

## Properties

### config?

> **config**?: [`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `undefined` \| `"off"` \| `"error"` \| `"warn"` \| `Object` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\> \| [`undefined` \| `"off"` \| `"error"` \| `"warn"`, `undefined` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\> \| `Object`] \| `Object`\>

The configuration options for the rules to run. If not provided, the
default configuration will be used.

#### Source

[packages/test-util/src/null-rule-runner.ts:107](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-rule-runner.ts#L107)

***

### emitter?

> **emitter**?: `EventEmitter`

The event emitter to use for emitting events (via the notifier functions).
If not provided, a new `EventEmitter` will be created.

#### Source

[packages/test-util/src/null-rule-runner.ts:113](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-rule-runner.ts#L113)

***

### filter?

> **filter**?: [`RuleFilter`](/api/midnight-smoker/midnight-smoker/type-aliases/rulefilter/)

Filter the rules to run (e.g., only those that are not disabled)

#### Source

[packages/test-util/src/null-rule-runner.ts:117](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-rule-runner.ts#L117)

***

### rules?

> **rules**?: `string`[]

The rules to run. If not provided, all rules will be run. If `filter`
provided, this is ignored.

#### Source

[packages/test-util/src/null-rule-runner.ts:101](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/test-util/src/null-rule-runner.ts#L101)
