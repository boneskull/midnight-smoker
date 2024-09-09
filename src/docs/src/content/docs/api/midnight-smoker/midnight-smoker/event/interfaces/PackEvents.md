---
editUrl: false
next: false
prev: false
title: "PackEvents"
---

## Extended By

- [`SmokerEvents`](/api/midnight-smoker/midnight-smoker/event/interfaces/smokerevents/)

## Events

### PackBegin

> **PackBegin**: [`PackBeginEventData`](/api/midnight-smoker/midnight-smoker/event/interfaces/packbegineventdata/)

Emitted whenever a package is about to be packed into a tarball.

#### Source

[packages/midnight-smoker/src/event/pack-events.ts:10](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/pack-events.ts#L10)

***

### PackFailed

> **PackFailed**: [`PackError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/packerror/)

Emitted whenever packing a tarball fails.

This is considered unrecoverable, and `midnight-smoker` will exit with a
non-zero code soon thereafter.

#### Source

[packages/midnight-smoker/src/event/pack-events.ts:20](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/pack-events.ts#L20)

***

### PackOk

> **PackOk**: [`InstallEventData`](/api/midnight-smoker/midnight-smoker/event/interfaces/installeventdata/)

Emitted whenever a package is packed successfully into a tarball.

#### Source

[packages/midnight-smoker/src/event/pack-events.ts:27](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/pack-events.ts#L27)
