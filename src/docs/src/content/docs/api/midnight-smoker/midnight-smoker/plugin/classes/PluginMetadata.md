---
editUrl: false
next: false
prev: false
title: "PluginMetadata"
---

All the metadata collected about a plugin.

Contains:

- Maps of all components the plugin provides.
- The plugin's `package.json` contents.
- The plugin's entry point.
- The plugin's unique identifier.

## Todo

The identifier _should_ be unique. Make sure that's tracked somewhere.

## Implements

- [`StaticPluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/interfaces/staticpluginmetadata/)

## Constructors

### new PluginMetadata(entryPoint, id)

> **`protected`** **new PluginMetadata**(`entryPoint`, `id`?): [`PluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)

Creates a new [PluginMetadata](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/) from an existing [PluginMetadata](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)
object and some opts--kind of like a "clone" operation.

Necessary because `PluginMetadata` should always be frozen.

#### Parameters

• **entryPoint**: `string`

Existing metadata

• **id?**: `string`

New props (or just an id)

#### Returns

[`PluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)

- A new [PluginMetadata](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/) instance based on `metadata`

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:211](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L211)

### new PluginMetadata(opts)

> **`protected`** **new PluginMetadata**(`opts`): [`PluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)

{@inheritDoc create:(1)}

#### Parameters

• **opts**: `Object`

• **opts\.description?**: `string`= `undefined`

• **opts\.entryPoint**: `string`= `undefined`

• **opts\.id?**: `string`= `undefined`

• **opts\.pkgJson?**: `PackageJson`= `undefined`

• **opts\.requestedAs?**: `string`= `undefined`

• **opts\.version?**: `string`= `undefined`

#### Returns

[`PluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:215](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L215)

## Properties

### description?

> **`readonly`** **description**?: `string`

Plugin description. May be derived from [pkgJson](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/#pkgjson) or provided in
[PluginMetadataOpts](/api/midnight-smoker/midnight-smoker/plugin/type-aliases/pluginmetadataopts/).

#### Implementation of

[`midnight-smoker.midnight-smoker/plugin.StaticPluginMetadata.description`](/api/midnight-smoker/midnight-smoker/plugin/interfaces/staticpluginmetadata/#description)

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:200](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L200)

***

### entryPoint

> **`readonly`** **entryPoint**: `LiteralUnion`\<`"<transient>"`, `string`\>

Plugin entry point. Usually a path and resolved from [requestedAs](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/#requestedas).

#### Implementation of

[`midnight-smoker.midnight-smoker/plugin.StaticPluginMetadata.entryPoint`](/api/midnight-smoker/midnight-smoker/plugin/interfaces/staticpluginmetadata/#entrypoint)

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:131](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L131)

***

### id

> **`readonly`** **id**: `string`

The full identifier of the plugin. Either custom name or package name.

#### Implementation of

[`midnight-smoker.midnight-smoker/plugin.StaticPluginMetadata.id`](/api/midnight-smoker/midnight-smoker/plugin/interfaces/staticpluginmetadata/#id)

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:136](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L136)

***

### pkgJson?

> **`readonly`** **pkgJson**?: `PackageJson`

The contents of the plugin's `package.json`.

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:146](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L146)

***

### requestedAs

> **`readonly`** **requestedAs**: `string`

The name of the plugin as requested by the user

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:141](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L141)

***

### version?

> **`readonly`** **version**?: `string`

Version of plugin. May be derived from [pkgJson](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/#pkgjson) or provided in
[PluginMetadataOpts](/api/midnight-smoker/midnight-smoker/plugin/type-aliases/pluginmetadataopts/).

#### Implementation of

[`midnight-smoker.midnight-smoker/plugin.StaticPluginMetadata.version`](/api/midnight-smoker/midnight-smoker/plugin/interfaces/staticpluginmetadata/#version)

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:206](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L206)

## Accessors

### rules

> **`get`** **rules**(): [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`SomeRule`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/somerule/)\>[]

Returns [Rule](/api/midnight-smoker/midnight-smoker/rule/classes/rule/) components within this plugin, if any

#### Returns

[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`SomeRule`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/somerule/)\>[]

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:324](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L324)

## Methods

### addExecutor()

> **addExecutor**(`name`, `value`): `void`

#### Parameters

• **name**: `string`

• **value**: [`Executor`](/api/midnight-smoker/midnight-smoker/executor/type-aliases/executor/)

#### Returns

`void`

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:442](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L442)

***

### addReporter()

> **addReporter**(`value`): `void`

#### Parameters

• **value**: [`ReporterDef`](/api/midnight-smoker/midnight-smoker/reporter/type-aliases/reporterdef/)

#### Returns

`void`

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:456](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L456)

***

### addRule()

> **addRule**\<`Name`, `Schema`\>(`ruleDef`): `void`

#### Type parameters

• **Name** extends `string`

• **Schema** extends `void` \| [`RuleOptionSchema`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/ruleoptionschema/) = `void`

#### Parameters

• **ruleDef**: [`RuleDef`](/api/midnight-smoker/midnight-smoker/rule/interfaces/ruledef/)\<`Name`, `Schema`\>

#### Returns

`void`

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:426](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L426)

***

### addRuleRunner()

> **addRuleRunner**(`name`, `value`): `void`

#### Parameters

• **name**: `string`

• **value**: (...`args`) => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

#### Returns

`void`

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:412](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L412)

***

### addScriptRunner()

> **addScriptRunner**(`name`, `value`): `void`

#### Parameters

• **name**: `string`

• **value**: (...`args`) => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>

#### Returns

`void`

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:396](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L396)

***

### toJSON()

> **toJSON**(): [`StaticPluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/interfaces/staticpluginmetadata/)

Serializes this object to a brief [StaticPluginMetadata](/api/midnight-smoker/midnight-smoker/plugin/interfaces/staticpluginmetadata/) object.

#### Returns

[`StaticPluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/interfaces/staticpluginmetadata/)

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:354](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L354)

***

### toString()

> **toString**(): `string`

Returns a string representation of this metadata

#### Returns

`string`

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:366](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L366)

***

### create()

> **`static`** **create**(`metadata`, `opts`): [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)\>

Creates a new [PluginMetadata](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/) from an existing [PluginMetadata](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)
object and some opts--kind of like a "clone" operation.

Necessary because `PluginMetadata` should always be frozen.

#### Parameters

• **metadata**: [`PluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)

Existing metadata

• **opts**: `string` \| [`Partial`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype )\<`Object`\>

New props (or just an id)

#### Returns

[`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)\>

- A new [PluginMetadata](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/) instance based on `metadata`

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:284](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L284)

## Component Map

### executorMap

> **`readonly`** **executorMap**: [`Map`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map )\<`string`, [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`Executor`](/api/midnight-smoker/midnight-smoker/executor/type-aliases/executor/)\>\>

A map of executor names to SomeExecutor objects contained in the
plugin

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:186](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L186)

***

### pkgManagerDefMap

> **`readonly`** **pkgManagerDefMap**: [`Map`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map )\<`string`, [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<`Object`\>\>

A map of package manager names to PackageManager objects contained
in the plugin

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:161](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L161)

***

### reporterMap

> **`readonly`** **reporterMap**: [`Map`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map )\<`string`, [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`ReporterDef`](/api/midnight-smoker/midnight-smoker/reporter/type-aliases/reporterdef/)\>\>

A map of reporter names to [ReporterDef](/api/midnight-smoker/midnight-smoker/reporter/type-aliases/reporterdef/) objects contained in the
plugin

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:194](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L194)

***

### ruleMap

> **`readonly`** **ruleMap**: [`Map`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map )\<`string`, [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`SomeRule`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/somerule/)\>\>

A map of rule names to [SomeRule](/api/midnight-smoker/midnight-smoker/rule/type-aliases/somerule/) objects contained in the plugin

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:153](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L153)

***

### ruleRunnerMap

> **`readonly`** **ruleRunnerMap**: [`Map`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map )\<`string`, [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<(...`args`) => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>\>\>

A map of rule runner names to [RuleRunner](/api/midnight-smoker/midnight-smoker/rule-runner/type-aliases/rulerunner/) objects contained in the
plugin

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:178](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L178)

***

### scriptRunnerMap

> **`readonly`** **scriptRunnerMap**: [`Map`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map )\<`string`, [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<(...`args`) => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>\>\>

A map of script runner names to [ScriptRunner](/api/midnight-smoker/midnight-smoker/script-runner/type-aliases/scriptrunner/) objects contained in
the plugin

#### Source

[packages/midnight-smoker/src/plugin/metadata.ts:170](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/metadata.ts#L170)
