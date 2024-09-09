---
editUrl: false
next: false
prev: false
title: "InstallEvents"
---

## Extended By

- [`SmokerEvents`](/api/midnight-smoker/midnight-smoker/event/interfaces/smokerevents/)

## Events

### InstallBegin

> **InstallBegin**: [`InstallEventData`](/api/midnight-smoker/midnight-smoker/event/interfaces/installeventdata/)

Emitted whenever a package is about to be installed (from a tarball) into
its temp directory.

Should happen once per package.

#### Source

[packages/midnight-smoker/src/event/install-events.ts:13](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L13)

***

### InstallFailed

> **InstallFailed**: [`InstallError`](/api/midnight-smoker/midnight-smoker/pkg-manager/namespaces/errors/classes/installerror/)

Emitted when a package fails to install.

This is considered unrecoverable, and `midnight-smoker` will exit with a
non-zero code soon thereafter.

#### Source

[packages/midnight-smoker/src/event/install-events.ts:23](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L23)

***

### InstallOk

> **InstallOk**: [`InstallOkEventData`](/api/midnight-smoker/midnight-smoker/event/interfaces/installokeventdata/)

Emitted when a package is installed successfully from a tarball.

#### Source

[packages/midnight-smoker/src/event/install-events.ts:30](https://github.com/boneskull/midnight-smoker/blob/417858b/packages/midnight-smoker/src/event/install-events.ts#L30)
