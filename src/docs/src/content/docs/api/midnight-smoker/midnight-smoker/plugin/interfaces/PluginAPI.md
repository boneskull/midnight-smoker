---
editUrl: false
next: false
prev: false
title: "PluginAPI"
---

The public plugin API which is provided to each plugin's entry function.

## Todo

Implement support for `Listener`s

## Properties

### Errors

> **Errors**: [`midnight-smoker/errors`](/api/midnight-smoker/midnight-smoker/errors/index/)

Collection of `Error` classes useful to plugin implementors.

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:68](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L68)

***

### Event

> **Event**: [`midnight-smoker/event`](/api/midnight-smoker/midnight-smoker/event/index/)

Namespace related to events

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:109](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L109)

***

### Executor

> **Executor**: [`midnight-smoker/executor`](/api/midnight-smoker/midnight-smoker/executor/index/)

Types related to `Executor`s.

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:73](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L73)

***

### Helpers

> **Helpers**: [`midnight-smoker/plugin/helpers`](/api/midnight-smoker/midnight-smoker/plugin/helpers/index/)

Collection of helpers for various components

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:78](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L78)

***

### PkgManager

> **PkgManager**: [`midnight-smoker/pkg-manager`](/api/midnight-smoker/midnight-smoker/pkg-manager/index/)

Namespace related to `PackageManager`s.

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:83](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L83)

***

### Rule

> **Rule**: [`midnight-smoker/rule`](/api/midnight-smoker/midnight-smoker/rule/index/)

Namespace related to `Rule`s.

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:88](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L88)

***

### RuleRunner

> **RuleRunner**: [`midnight-smoker/rule-runner`](/api/midnight-smoker/midnight-smoker/rule-runner/index/)

Namespace related to `RuleRunner`s.

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:93](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L93)

***

### SchemaUtils

> **SchemaUtils**: `__module`

Some useful pre-rolled [zod](/api/midnight-smoker/midnight-smoker/plugin/interfaces/pluginapi/#zod) schemas; mainly useful for [Rule](/api/midnight-smoker/midnight-smoker/plugin/interfaces/pluginapi/#rule)
schemas.

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:99](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L99)

***

### ScriptRunner

> **ScriptRunner**: [`midnight-smoker/script-runner`](/api/midnight-smoker/midnight-smoker/script-runner/index/)

Namespace related to `ScriptRunner`s

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:104](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L104)

***

### defineExecutor

> **defineExecutor**: [`DefineExecutorFn`](/api/midnight-smoker/midnight-smoker/plugin/type-aliases/defineexecutorfn/)

Defines an [Executor.Executor](/api/midnight-smoker/midnight-smoker/executor/type-aliases/executor/) component

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:121](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L121)

***

### definePackageManager

> **definePackageManager**: [`DefinePackageManagerFn`](/api/midnight-smoker/midnight-smoker/plugin/type-aliases/definepackagemanagerfn/)

Defines a [PkgManager.PkgManager](/api/midnight-smoker/midnight-smoker/pkg-manager/type-aliases/pkgmanager/) component

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:126](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L126)

***

### defineReporter

> **defineReporter**: [`DefineReporterFn`](/api/midnight-smoker/midnight-smoker/plugin/type-aliases/definereporterfn/)

Defines a [Reporter.ReporterDef](/api/midnight-smoker/midnight-smoker/reporter/type-aliases/reporterdef/) component

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:162](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L162)

***

### defineRule

> **defineRule**: [`DefineRuleFn`](/api/midnight-smoker/midnight-smoker/plugin/type-aliases/definerulefn/)

Defines a [Rule.RuleDef](/api/midnight-smoker/midnight-smoker/rule/interfaces/ruledef/) component

#### Example

```ts
import type {PluginAPI} from 'midnight-smoker/plugin';

export function plugin({defineRule}: PluginAPI) {
  defineRule({
    name: 'my-rule',
    async check() {
      // ...
    },
  });
}
```;
```

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:147](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L147)

***

### defineRuleRunner

> **defineRuleRunner**: [`DefineRuleRunnerFn`](/api/midnight-smoker/midnight-smoker/plugin/type-aliases/definerulerunnerfn/)

Defines a [RuleRunner.RuleRunner](/api/midnight-smoker/midnight-smoker/rule-runner/type-aliases/rulerunner/) component

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:152](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L152)

***

### defineScriptRunner

> **defineScriptRunner**: [`DefineScriptRunnerFn`](/api/midnight-smoker/midnight-smoker/plugin/type-aliases/definescriptrunnerfn/)

Defines a [ScriptRunner.ScriptRunner](/api/midnight-smoker/midnight-smoker/script-runner/type-aliases/scriptrunner/) component

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:157](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L157)

***

### metadata

> **metadata**: [`PluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)

Metadata gathered about this plugin.

The component maps within the metadata will be updated as the `define*`
functions are called.

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:170](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L170)

***

### plugins

> **plugins**: readonly [`StaticPluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/interfaces/staticpluginmetadata/)[]

Basic information about other plugins.

Re-computed at time of access.

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:116](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L116)

***

### z

> **z**: `__module`

It's Zod.

#### See

[https://zod.dev](https://zod.dev)

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:177](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L177)

***

### zod

> **zod**: `__module`

Alias of [z](/api/midnight-smoker/midnight-smoker/plugin/interfaces/pluginapi/#z)

#### Source

[packages/midnight-smoker/src/plugin/plugin-api.ts:182](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/plugin-api.ts#L182)
