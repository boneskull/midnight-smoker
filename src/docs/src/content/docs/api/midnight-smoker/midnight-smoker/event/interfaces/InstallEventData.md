---
editUrl: false
next: false
prev: false
title: "InstallEventData"
---

## Extended By

- [`InstallOkEventData`](/api/midnight-smoker/midnight-smoker/event/interfaces/installokeventdata/)

## Properties

### additionalDeps

> **additionalDeps**: `string`[]

A unique list of additional dependencies to install (if any), flatted from
[manifests](/api/midnight-smoker/midnight-smoker/event/interfaces/installeventdata/#manifests)

#### Source

[packages/midnight-smoker/src/event/install-events.ts:64](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L64)

***

### manifests

> **manifests**: [`InstallManifest`](/api/midnight-smoker/midnight-smoker/pkg-manager/interfaces/installmanifest/)[]

A list of objects describing what packages to install where, and what
additional deps to install (if any).

#### Source

[packages/midnight-smoker/src/event/install-events.ts:58](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L58)

***

### pkgManagerSpecs

> **pkgManagerSpecs**: `string`[]

List of unique package manager specifiers, each of which corresponding to a
package manager which will (or did) execute the current operation.

#### Source

[packages/midnight-smoker/src/event/install-events.ts:47](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L47)

***

### pkgManagers

> **pkgManagers**: [`string`, `string`][]

List of unique package managers, corresponding to specifiers

#### Source

[packages/midnight-smoker/src/event/install-events.ts:52](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L52)

***

### total

> **total**: `number`

Total number of packages to install

#### Source

[packages/midnight-smoker/src/event/install-events.ts:69](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L69)

***

### uniquePkgs

> **uniquePkgs**: `string`[]

List of unique package names which either will be or have been installed
(depending on context).

#### Source

[packages/midnight-smoker/src/event/install-events.ts:42](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L42)
