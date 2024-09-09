---
editUrl: false
next: false
prev: false
title: "PluginRegistry"
---

## Accessors

### isClosed

> **`get`** **isClosed**(): `boolean`

#### Returns

`boolean`

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:98](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L98)

***

### pkgManagerDefs

> **`get`** **pkgManagerDefs**(): [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<`Object`\>[]

#### Returns

[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<`Object`\>[]

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:191](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L191)

***

### plugins

> **`get`** **plugins**(): [`StaticPluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/interfaces/staticpluginmetadata/)[]

#### Returns

[`StaticPluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/interfaces/staticpluginmetadata/)[]

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:578](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L578)

***

### reporters

> **`get`** **reporters**(): [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`ReporterDef`](/api/midnight-smoker/midnight-smoker/reporter/type-aliases/reporterdef/)\>[]

#### Returns

[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`ReporterDef`](/api/midnight-smoker/midnight-smoker/reporter/type-aliases/reporterdef/)\>[]

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:195](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L195)

## Methods

### buildRuleOptions()

> **buildRuleOptions**(): `ZodDefault`\<`ZodObject`\<`Object`, `"strip"`, `ZodPipeline`\<`ZodUnion`\<[`ZodEffects`\<`ZodDefault`\<`ZodObject`\<`Object`, `"strict"`, `any`, `Object`, `Object`\>\>, `Object`, `undefined` \| `Object`\> \| `ZodEffects`\<`ZodDefault`\<`ZodObject`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `"passthrough"`, `ZodTypeAny`, `objectOutputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>, `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>\>\>, `Object`, `undefined` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>\>, `ZodEffects`\<`ZodDefault`\<`ZodNativeEnum`\<`Object`\>\>, `Object`, `undefined` \| `"error"` \| `"warn"` \| `"off"`\>, `ZodEffects`\<`ZodTuple`\<[`ZodDefault`\<`ZodNativeEnum`\<`Object`\>\>, `ZodDefault`\<`ZodObject`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `"passthrough"`, `ZodTypeAny`, `objectOutputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>, `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>\>\> \| `ZodDefault`\<`ZodObject`\<`Object`, `"strict"`, `any`, `Object`, `Object`\>\>], `null`\>, `Object`, [`undefined` \| `"error"` \| `"warn"` \| `"off"`, `undefined` \| `Object` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>]\>, `ZodObject`\<`Object`, `"strict"`, `ZodTypeAny`, `Object`, `Object`\>]\>, `ZodObject`\<`Object`, `"strict"`, `ZodTypeAny`, `Object`, `Object`\>\>, `Object`, `Object`\>\>

#### Returns

`ZodDefault`\<`ZodObject`\<`Object`, `"strip"`, `ZodPipeline`\<`ZodUnion`\<[`ZodEffects`\<`ZodDefault`\<`ZodObject`\<`Object`, `"strict"`, `any`, `Object`, `Object`\>\>, `Object`, `undefined` \| `Object`\> \| `ZodEffects`\<`ZodDefault`\<`ZodObject`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `"passthrough"`, `ZodTypeAny`, `objectOutputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>, `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>\>\>, `Object`, `undefined` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>\>, `ZodEffects`\<`ZodDefault`\<`ZodNativeEnum`\<`Object`\>\>, `Object`, `undefined` \| `"error"` \| `"warn"` \| `"off"`\>, `ZodEffects`\<`ZodTuple`\<[`ZodDefault`\<`ZodNativeEnum`\<`Object`\>\>, `ZodDefault`\<`ZodObject`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `"passthrough"`, `ZodTypeAny`, `objectOutputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>, `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>\>\> \| `ZodDefault`\<`ZodObject`\<`Object`, `"strict"`, `any`, `Object`, `Object`\>\>], `null`\>, `Object`, [`undefined` \| `"error"` \| `"warn"` \| `"off"`, `undefined` \| `Object` \| `objectInputType`\<[`Omit`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`string`, `ZodTypeAny`\>, `"opts"`\>, `ZodTypeAny`, `"passthrough"`\>]\>, `ZodObject`\<`Object`, `"strict"`, `ZodTypeAny`, `Object`, `Object`\>]\>, `ZodObject`\<`Object`, `"strict"`, `ZodTypeAny`, `Object`, `Object`\>\>, `Object`, `Object`\>\>

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:110](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L110)

***

### clear()

> **clear**(): `void`

Clears all plugins from the registry and resets all internal state.

#### Returns

`void`

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:118](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L118)

***

### close()

> **close**(): `void`

Closes the registry, preventing further plugins from being registered.

#### Returns

`void`

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:337](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L337)

***

### createPluginAPI()

> **createPluginAPI**(`metadata`): [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PluginAPI`](/api/midnight-smoker/midnight-smoker/plugin/interfaces/pluginapi/)\>

Creates a [API.PluginAPI](/api/midnight-smoker/midnight-smoker/plugin/interfaces/pluginapi/) object for use by a specific plugin.

#### Parameters

• **metadata**: [`PluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)

Plugin metadata

#### Returns

[`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PluginAPI`](/api/midnight-smoker/midnight-smoker/plugin/interfaces/pluginapi/)\>

A [API.PluginAPI](/api/midnight-smoker/midnight-smoker/plugin/interfaces/pluginapi/) object for use by a specific plugin

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:610](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L610)

***

### getBlessedMetadata()

> **getBlessedMetadata**(): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`"@midnight-smoker/plugin-default"`, [`PluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)\>\>\>

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`Record`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type )\<`"@midnight-smoker/plugin-default"`, [`PluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)\>\>\>

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:102](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L102)

***

### getExecutor()

> **getExecutor**(`componentId`): [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`Executor`](/api/midnight-smoker/midnight-smoker/executor/type-aliases/executor/)\>

#### Parameters

• **componentId**: `string`= `DEFAULT_COMPONENT_ID`

#### Returns

[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`Executor`](/api/midnight-smoker/midnight-smoker/executor/type-aliases/executor/)\>

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:149](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L149)

***

### getRuleRunner()

> **getRuleRunner**(`componentId`): [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<(...`args`) => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>\>

#### Parameters

• **componentId**: `string`= `DEFAULT_COMPONENT_ID`

#### Returns

[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<(...`args`) => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>\>

>
>

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:161](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L161)

***

### getRules()

> **getRules**(`filter`?): [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`SomeRule`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/somerule/)\>[]

#### Parameters

• **filter?**: [`RuleFilter`](/api/midnight-smoker/midnight-smoker/type-aliases/rulefilter/)

#### Returns

[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<[`SomeRule`](/api/midnight-smoker/midnight-smoker/rule/type-aliases/somerule/)\>[]

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:132](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L132)

***

### getScriptRunner()

> **getScriptRunner**(`componentId`): [`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<(...`args`) => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>\>

#### Parameters

• **componentId**: `string`= `DEFAULT_COMPONENT_ID`

#### Returns

[`Component`](/api/midnight-smoker/midnight-smoker/component/type-aliases/component/)\<(...`args`) => [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<`Object`\>\>

>
>

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:137](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L137)

***

### loadPackageManagers()

> **loadPackageManagers**(`__namedParameters`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Map`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map )\<[`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>, `Object`\>\>

#### Parameters

• **\_\_namedParameters**: [`RegistryLoadPackageManagersOpts`](/api/midnight-smoker/midnight-smoker/interfaces/registryloadpackagemanagersopts/)= `{}`

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`Map`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map )\<[`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`PkgManagerSpec`](/api/midnight-smoker/midnight-smoker/plugin/helpers/classes/pkgmanagerspec/)\>, `Object`\>\>

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:173](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L173)

***

### loadPlugins()

> **loadPlugins**(`pluginIds`, `cwd`?): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)\>

Loads all plugins

#### Parameters

• **pluginIds**: `string`[] \| readonly `string`[]= `[]`

• **cwd?**: `string`

Current working directory

#### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)\>

This [PluginRegistry](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:220](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L220)

***

### registerPlugin()

#### registerPlugin(entryPoint, name)

> **registerPlugin**(`entryPoint`, `name`?): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)\>

Registers a plugin "manually"

##### Parameters

• **entryPoint**: `string`

Module ID of plugin entry point; something resolvable

• **name?**: `string`

Plugin name (useful if a relative path is provided for
  `entryPoint`)

##### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)\>

Metadata containing rules, if any

##### Source

[packages/midnight-smoker/src/plugin/registry.ts:373](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L373)

#### registerPlugin(metadata, plugin)

> **registerPlugin**(`metadata`, `plugin`?): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)\>

Registers a plugin from metadata; this is the usual flow.

##### Parameters

• **metadata**: [`PluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)

Already-created [PluginMetadata](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/) object

• **plugin?**: `Object`

Already-loaded, normalized plugin object

• **plugin\.description?**: `string`= `undefined`

• **plugin\.name?**: `string`= `undefined`

• **plugin\.plugin?**: [`PluginFactory`](/api/midnight-smoker/midnight-smoker/plugin/type-aliases/pluginfactory/)= `zPluginFactory`

• **plugin\.version?**: `string`= `undefined`

##### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)\>

##### Source

[packages/midnight-smoker/src/plugin/registry.ts:384](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L384)

#### registerPlugin(name, plugin)

> **registerPlugin**(`name`, `plugin`): [`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)\>

Registers a plugin from a name and a plugin object; this is used by the
plugin test API.

##### Parameters

• **name**: `string`

Plugin name

• **plugin**: `Object`

Already-loaded, normalized plugin object

• **plugin\.description?**: `string`= `undefined`

• **plugin\.name?**: `string`= `undefined`

• **plugin\.plugin**: [`PluginFactory`](/api/midnight-smoker/midnight-smoker/plugin/type-aliases/pluginfactory/)= `zPluginFactory`

• **plugin\.version?**: `string`= `undefined`

##### Returns

[`Promise`]( https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise )\<[`PluginMetadata`](/api/midnight-smoker/midnight-smoker/plugin/classes/pluginmetadata/)\>

##### Source

[packages/midnight-smoker/src/plugin/registry.ts:396](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L396)

***

### toJSON()

> **toJSON**(): [`StaticPluginRegistry`](/api/midnight-smoker/midnight-smoker/interfaces/staticpluginregistry/)

#### Returns

[`StaticPluginRegistry`](/api/midnight-smoker/midnight-smoker/interfaces/staticpluginregistry/)

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:594](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L594)

***

### toString()

> **toString**(): `string`

#### Returns

`string`

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:590](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L590)

***

### create()

> **`static`** **create**(): [`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)

#### Returns

[`PluginRegistry`](/api/midnight-smoker/midnight-smoker/classes/pluginregistry/)

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:94](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L94)

***

### normalizePlugin()

> **`static`** **normalizePlugin**(`rawPlugin`): `Object`

Given the export(s) of a plugin's entry point, validate it and return a
[Plugin](/api/midnight-smoker/midnight-smoker/plugin/type-aliases/plugin/).

#### Parameters

• **rawPlugin**: `unknown`

#### Returns

`Object`

> ##### description?
>
> > **description**?: `string`
>
> ##### name?
>
> > **name**?: `string`
>
> ##### plugin
>
> > **plugin**: [`PluginFactory`](/api/midnight-smoker/midnight-smoker/plugin/type-aliases/pluginfactory/) = `zPluginFactory`
>
> ##### version?
>
> > **version**?: `string`
>

#### Source

[packages/midnight-smoker/src/plugin/registry.ts:586](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/plugin/registry.ts#L586)
