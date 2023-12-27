---
title: Plugin Authoring
description: How to create your own plugins for `midnight-smoker`
---

## Who This Guide is For

This guide is for you if you want to:

- Create custom rules (automated checks) to run against your packages
- Create a handler for an unsupported package manager
- Create a custom reporter
- Create a different strategy for invoking custom scripts (parallel, distributed, avoid package managers entirely, etc.) and emitting events for the results
- Create middleware to control how automated checks are run (use-case here is iffy, but it's there)
- Create a custom strategy for invoking package managers (alternative to `corepack`?)
- (FUTURE) Create a custom configuration loader
- (FUTURE) Custom CLI options & commands
- (FUTURE) Custom configuration for all [components](#about-components)

## What is a Plugin?

A plugin is a module (it needn't be an entire package, but that's fine too) with a _named export_ `plugin` which conforms to the following interface:

```typescript
export type PluginFactory = (api: PluginAPI) => void | Promise<void>;
```

> ![NOTE] Alternatively, a default export may be provided. In the case of CJS, this would correspond to `module.exports = ...`; a named `plugin` export would be `exports.plugin = ...` or `module.exports.plugin = ...`.

The `PluginAPI` object will be your main interface into `midnight-smoker`. You _shouldn't_ need to pull anything other than types (if using TypeScript) from the `midnight-smoker` package itself.

It's _strongly recommended_ to use TypeScript (or type-safe JS) when writing plugins, as it will help you navigate the `PluginAPI` object.

Next, we'll look at the `PluginAPI` object.

## The Plugin API

The `PluginAPI` object is the main interface into `midnight-smoker`. Its main purpose is to provide functions which a plugin will call to define _Components_.

### About Components

A plugin will contain one or more _Components_. A Component is an implementation of one of the following:

- A _package manager_
- A _rule_
- A custom _script runner_
- A custom _reporter_ (emits output for user) or _listener_ (listens for events, but doesn't necessarily output anything)
- A custom _rule runner_ (runs automated checks)
- A custom _executor_ (invokes package managers)

Since the most common use case will probably be a custom rule, let's take a look at that first.

### Rules

Much like [ESLint](https://eslint.org), a custom rule allows the author to define a "check" to run against a package. The rule can have its own set of options, and is user-configurable via a [config file](./README.md#config-files). Rules can be considered "errors" or "warnings" per the user's preference. The user may also disable a rule entirely.

> [!WARNING] I hope you like [Zod](https://zod.dev).

To define a rule, we'll use the `api.defineRule()` function. Below is an example of a trivial rule which asserts the `package.json` of a package always has a `private` property set to `true`:

[plugin-rule.ts](_media/example/plugin-rule.ts ':include')

To load your plugin, you'll need to tell `midnight-smoker` it exists. To do so, provide the `--plugin plugin-rule.ts` option to the `smoker` CLI, or add this to your config:

```json
{
  "plugins": ["./path/to/plugin-rule.ts"]
}
```

Now, when `midnight-smoker` runs its automated checks, it will run the `no-public-pkgs` rule along with the set of builtin rules.

> [!NOTE] The "real" name of the rule will be scoped to the plugin's name. The plugin's name is derived from the closest `package.json`.

For more information about rule-related functions and types within the `PluginAPI` object, see the [reference documentation](./reference.md).
