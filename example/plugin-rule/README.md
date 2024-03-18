# Example Plugin: Rule

> An example plugin for [midnight-smoker][] which adds a custom rule

## Try It

1. Clone [midnight-smoker][]
2. Navigate to `example/plugin-rule/` (this directory)
3. Execute `npm install`
4. Execute `npm start`. You should see output similar to the following:

```bash
npm start

> example-rule-plugin@1.0.0 start
> npm --workspaces start


> plugin-rule-failed@1.0.0 start
> smoker --plugin ../../index.js

💨 midnight-smoker v7.0.4
✔ Packed 1 unique package using npm@9.8.1…
✔ Installed 1 unique package from tarball
✖ 1 check of 5 failed
⚠ Issues found in package plugin-rule-failed:
- ✖ Package must be private

✖ 🤮 Maurice!
npm ERR! Lifecycle script `start` failed with error:
npm ERR! Error: command failed
npm ERR!   in workspace: plugin-rule-failed@1.0.0
npm ERR!   at location: /path/to/midnight-smoker/example/plugin-rule/fixtures/plugin-rule-failed

> plugin-rule-ignored@1.0.0 start
> smoker --plugin ../../index.js

💨 midnight-smoker v7.0.4
✔ Packed 1 unique package using npm@9.8.1…
✔ Installed 1 unique package from tarball
✔ Successfully ran 5 checks
✔ Lovey-dovey! 💖

> plugin-rule-ok@1.0.0 start
> smoker --plugin ../../index.js

💨 midnight-smoker v7.0.4
✔ Packed 1 unique package using npm@9.8.1…
✔ Installed 1 unique package from tarball
✔ Successfully ran 5 checks
✔ Lovey-dovey! 💖
```

## How it Works

While this package's organization is somewhat unorthodox, what we have is:

- A plugin in the workspace root, exported by `index.js`
- Three (3) workspaces in the `fixtures` directory:
  - `plugin-rule-fail`: A package which fails the rule (its `package.json` does not contain `private: true`)
  - `plugin-rule-ok`: A package which passes the rule (a private package)
  - `plugin-rule-ignore`: A package which would fail the rule, but uses the rule's configuration to ignore itself (yes, it's silly)

The workspace root has a `start` script which invokes the `start` script of each workspace.

> [!NOTE] [midnight-smoker] runs its built-in rules in addition to our custom rule; this is why you see 5 checks instead of 1.

[midnight-smoker]: https://github.com/midnight-smoker
