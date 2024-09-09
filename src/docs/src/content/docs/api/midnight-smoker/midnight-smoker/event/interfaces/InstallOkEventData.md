---
editUrl: false
next: false
prev: false
title: "InstallOkEventData"
---

## Extends

- [`InstallEventData`](/api/midnight-smoker/midnight-smoker/event/interfaces/installeventdata/)

## Properties

### additionalDeps

> **additionalDeps**: `string`[]

A unique list of additional dependencies to install (if any), flatted from
[manifests](/api/midnight-smoker/midnight-smoker/event/interfaces/installokeventdata/#manifests)

#### Inherited from

[`midnight-smoker.midnight-smoker/event.InstallEventData.additionalDeps`](/api/midnight-smoker/midnight-smoker/event/interfaces/installeventdata/#additionaldeps)

#### Source

[packages/midnight-smoker/src/event/install-events.ts:64](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L64)

***

### current

> **current**: `number`

#### Source

[packages/midnight-smoker/src/event/install-events.ts:73](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L73)

***

### manifests

> **manifests**: [`InstallManifest`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/installmanifest/)[]

A list of objects describing what packages to install where, and what
additional deps to install (if any).

#### Inherited from

[`midnight-smoker.midnight-smoker/event.InstallEventData.manifests`](/api/midnight-smoker/midnight-smoker/event/interfaces/installeventdata/#manifests)

#### Source

[packages/midnight-smoker/src/event/install-events.ts:58](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L58)

***

### pkgManagerSpecs

> **pkgManagerSpecs**: `string`[]

List of unique package manager specifiers, each of which corresponding to a
package manager which will (or did) execute the current operation.

#### Inherited from

[`midnight-smoker.midnight-smoker/event.InstallEventData.pkgManagerSpecs`](/api/midnight-smoker/midnight-smoker/event/interfaces/installeventdata/#pkgmanagerspecs)

#### Source

[packages/midnight-smoker/src/event/install-events.ts:47](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L47)

***

### pkgManagers

> **pkgManagers**: [`string`, `string`][]

List of unique package managers, corresponding to specifiers

#### Inherited from

[`midnight-smoker.midnight-smoker/event.InstallEventData.pkgManagers`](/api/midnight-smoker/midnight-smoker/event/interfaces/installeventdata/#pkgmanagers)

#### Source

[packages/midnight-smoker/src/event/install-events.ts:52](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L52)

***

### total

> **total**: `number`

Total number of packages to install

#### Inherited from

[`midnight-smoker.midnight-smoker/event.InstallEventData.total`](/api/midnight-smoker/midnight-smoker/event/interfaces/installeventdata/#total)

#### Source

[packages/midnight-smoker/src/event/install-events.ts:69](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L69)

***

### uniquePkgs

> **uniquePkgs**: `string`[]

List of unique package names which either will be or have been installed
(depending on context).

#### Inherited from

[`midnight-smoker.midnight-smoker/event.InstallEventData.uniquePkgs`](/api/midnight-smoker/midnight-smoker/event/interfaces/installeventdata/#uniquepkgs)

#### Source

[packages/midnight-smoker/src/event/install-events.ts:42](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L42)
