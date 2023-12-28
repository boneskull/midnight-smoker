---
title: Getting Started
description: Getting started with midnight-smoker
---

This brief guide will help you get started with **midnight-smoker**.

## Supported Environments

### Platforms

**midnight-smoker** is intended for use with Node.js.

- Node.js versions supported: `^18.0.0 || ^20.0.0`
- Supported package managers:
  - `npm`: `8.6.0+`
  - `yarn`: any version
  - `pnpm`: (not yet supported)

:::caution

While versions of Node.js outside the supported range _could_ work, compatibility is not tested. Use at your own _significant peril_.

:::

### Workspaces

**midnight-smoker** supports workspaces as commonly defined in `package.json`.

## Installation

If you're here, you probably don't need to know how to install it, but I feel like I'm supposed to write this anyway?

It's recommended to install `midnight-smoker` as a dev dependency:

```shell
npm install midnight-smoker --save-dev
```

## Basic Usage

To run **midnight-smoker**'s builtin checks against your project, run the following command:

```shell
npx midnight-smoker
```

Assuming your package isn't all jacked up, you should see output akin to:

```plain
💨 midnight-smoker vX.Y.Z
✔ Packed 1 unique package using npm@latest…
✔ Installed 1 unique package from tarball
✔ Successfully ran 4 checks
✔ Successfully ran 1 script
✔ Lovey-dovey! 💖
```

Next, read about the [command-line interface](/guides/cli).
