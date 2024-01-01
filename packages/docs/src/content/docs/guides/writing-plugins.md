---
title: Writing Plugins
description: How to create your own plugins for `midnight-smoker`
---

This guide describes how to create your own plugins for `midnight-smoker`.

## Who This Guide is For

If you want to do any of these things:

- Create custom rules (automated lint checks) to run against your packages
- Create a handler for an unsupported package manager
- Create a custom reporter
- Create a different strategy for invoking custom scripts (parallel, distributed, avoid package managers entirely, etc.) and emitting events for the results
- Create middleware to control how rules get run (use-case here is iffy, but it's there)
- Create a custom strategy for invoking package managers (alternative to `corepack`?)
- (FUTURE) Create a custom configuration loader
- (FUTURE) Custom CLI options & commands
- (FUTURE) Custom configuration for all [components](#whats-a-component)

...then this guide is for _you_.

## What is a Plugin?

A plugin is a CJS or ESM module (it needn't be an entire package, but that's fine too) with a _named export_ `plugin` which conforms to the following interface:

```typescript
export type PluginFactory = (api: PluginAPI) => void | Promise<void>;
```

The implementation of a `PluginFactory` is expected to use the `PluginAPI` object to register one or more [_components_](#whats-a-component).

### Plugin Exports

Instead of a named `plugin` export, a _default_ export may be provided. In the case of CJS, this would correspond to `module.exports = ...`, and the equivalent to a named `plugin` export would be `exports.plugin = ...`.

:::tip[Use Types]

It's _strongly recommended_ to use TypeScript (either TS proper or JSDoc) when writing plugins, as it will help you navigate the `PluginAPI` object.

:::

Both ESM and CJS plugins are supported.

### What's a Component?

`midnight-smoker` is ~~overengineered~~ modular, and most functionality is provided by _components_. A component is typically a function or object implementing one of a handful of interfaces defined by `midnight-smoker`.

A component may be one of:

- A lint **rule** — analyzes the installed package artifact
- A **reporter** — emits output
- A **package manager** adapter — logic for packing, installing, and running custom scripts
- A **script runner** — orchestrates custom script runs
- A **rule runner** — invokes rules (dubious use-case)
- An **executor** — spawns processes

:::note[Mea Culpa]

A "component" means something entirely different in the context of `midnight-smoker` than it does in a web context. Please [send suggestions](https://github.com/boneskull/midnight-smoker/issues/new) for a better word.

:::

Next, let's [take a closer look](#the-plugin-api) at the `PluginAPI` object by creating a custom rule.

## The Plugin API

The `PluginAPI` object is a plugin's main interface into `midnight-smoker`. It aims to provide _all_ the functionality that a plugin implementation needs to do its job.

Since the most common use case will probably be a custom rule, let's take a look at that first.

### Writing a Rule

Much like [ESLint](https://eslint.org), a custom rule allows the implementor to define a "check". Instead of running against an AST, `midnight-smoker` runs against an _installed package artifact._

Again like ESLint, a rule can define its own options. These options are user-configurable via a [config file](/reference/config).

To create a rule, we'll use the `api.defineRule()` function. Below is an example plugin. This plugin defines a trivial rule which asserts the `package.json` of the package under test always has a `private` property set to `true`.

<!-- TODO: must make a new example -->

<!-- prettier-ignore -->
```ts file=../../../../../../example/plugin-rule/index.ts title="plugin-rule.ts"
```

**`midnight-smoker` does not automatically detect plugins.** To use a plugin, it _must_ be referenced in the [config file](/reference/config) _or_ the [CLI](/reference/cli) via `--plugin ./plugin-rule.ts`.

Assuming `plugin-rule.ts` is in the same directory as `smoker.config.json`, here's an example config file:

```json title="smoker.config.json"
{
  "plugin": ["./plugin-rule.ts"]
}
```

Now, when `midnight-smoker` lints, it will run the `no-public-pkgs` rule along with the set of builtin rules.

:::note[Scoped Rule Names]

The "full" name of the rule (its "rule ID") will be _scoped_ to the plugin's name. For example, if the plugin is `foo` and the rule is `bar`, the rule's ID will be `foo/bar`. This is how it must be referenced in a config file.

The plugin's name is derived from the _closest ancestor `package.json`_ of the plugin's entry point.

Built-in rules' rule IDs do not have a scope.

:::

Let's assume the name of our plugin is `plugin-rule`. We can test our options by adding some lines to our config:

```diff lang=json title="smoker.config.json"
{
  "plugins": ["./path/to/plugin-rule.ts"],
+  "rules": {
+    "plugin-rule/no-public-pkgs": {
+      "ignore": ["my-public-pkg"]
+    }
+  }
}
```
