---
editUrl: false
next: false
prev: false
title: "ComponentId"
---

Represents a unique identifier for a component and the stuff that the
identifier is created from

## Constructors

### new ComponentId(pluginName, name)

> **new ComponentId**(`pluginName`, `name`): [`ComponentId`](/api/midnight-smoker/midnight-smoker/component/classes/componentid/)

Do not use this constructor directly; use [ComponentId.create](/api/midnight-smoker/midnight-smoker/component/classes/componentid/#create)
instead.

#### Parameters

• **pluginName**: `string`

Plugin name

• **name**: `string`

Component name

#### Returns

[`ComponentId`](/api/midnight-smoker/midnight-smoker/component/classes/componentid/)

#### Source

[packages/midnight-smoker/src/component/component/component-id.ts:31](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/component/component-id.ts#L31)

## Properties

### id

> **`readonly`** **id**: `string`

The actual ID.

#### Source

[packages/midnight-smoker/src/component/component/component-id.ts:22](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/component/component-id.ts#L22)

***

### name

> **`readonly`** **name**: `string`

Component name

#### Source

[packages/midnight-smoker/src/component/component/component-id.ts:33](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/component/component-id.ts#L33)

***

### pluginName

> **`readonly`** **pluginName**: `string`

Plugin name

#### Source

[packages/midnight-smoker/src/component/component/component-id.ts:32](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/component/component-id.ts#L32)

## Accessors

### isBlessed

> **`get`** **isBlessed**(): `boolean`

Checks if the component is _blessed_.

#### Todo

Would it be helpful to have a `Blessed` type?

#### Returns

`boolean`

`true` if the component is blessed, `false` otherwise.

#### Source

[packages/midnight-smoker/src/component/component/component-id.ts:66](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/component/component-id.ts#L66)

## Methods

### toString()

> **toString**(): `string`

Returns a string representation of the [ComponentId](/api/midnight-smoker/midnight-smoker/component/classes/componentid/).

#### Returns

`string`

The string representation of the [ComponentId](/api/midnight-smoker/midnight-smoker/component/classes/componentid/).

#### Source

[packages/midnight-smoker/src/component/component/component-id.ts:43](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/component/component-id.ts#L43)

***

### create()

> **`static`** **create**(`pluginName`, `name`): [`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`ComponentId`](/api/midnight-smoker/midnight-smoker/component/classes/componentid/)\>

Creates a new [ComponentId](/api/midnight-smoker/midnight-smoker/component/classes/componentid/) object.

#### Parameters

• **pluginName**: `string`

Plugin name

• **name**: `string`

Component name

#### Returns

[`Readonly`]( https://www.typescriptlang.org/docs/handbook/utility-types.html#readonlytype )\<[`ComponentId`](/api/midnight-smoker/midnight-smoker/component/classes/componentid/)\>

A [ComponentId](/api/midnight-smoker/midnight-smoker/component/classes/componentid/) object

#### Source

[packages/midnight-smoker/src/component/component/component-id.ts:97](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/component/component-id.ts#L97)

***

### parse()

> **`static`** **parse**(`id`): `undefined` \| [`ComponentId`](/api/midnight-smoker/midnight-smoker/component/classes/componentid/)

Parses a string representation of a component ID and returns a
[ComponentId](/api/midnight-smoker/midnight-smoker/component/classes/componentid/) object.

#### Parameters

• **id**: `string`

The string representation of the component ID.

#### Returns

`undefined` \| [`ComponentId`](/api/midnight-smoker/midnight-smoker/component/classes/componentid/)

The parsed [ComponentId](/api/midnight-smoker/midnight-smoker/component/classes/componentid/) object, or undefined if the ID is
  invalid.

#### Source

[packages/midnight-smoker/src/component/component/component-id.ts:78](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/component/component-id.ts#L78)

***

### toString()

> **`static`** **toString**(`pluginName`, `name`): `string`

Converts the plugin name and component name into a string representation.
If the plugin name is a _blessed_ plugin, it returns the component name
only. Otherwise, it returns a string "scoped" by the plugin name.

#### Parameters

• **pluginName**: `string`

The name of the plugin.

• **name**: `string`

The name of the component.

#### Returns

`string`

The string representation of the plugin and component names.

#### Source

[packages/midnight-smoker/src/component/component/component-id.ts:56](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/component/component/component-id.ts#L56)
