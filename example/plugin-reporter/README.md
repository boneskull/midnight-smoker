# Example Plugin: Reporter

> An example plugin for [midnight-smoker][] which adds a custom reporter

## Try It

1. Clone [midnight-smoker][]
2. Navigate to `/example/plugin-reporter` (this directory)
3. Execute `npm install`
4. Execute `npm start`. You should see output similar to the following:

```bash
npm start

> example-reporter-plugin@1.0.0 start
> npm --workspaces start


> plugin-reporter-fail@1.0.0 start
> smoker

.....!
npm ERR! Lifecycle script `start` failed with error:
npm ERR! Error: command failed
npm ERR!   in workspace: plugin-reporter-fail@1.0.0
npm ERR!   at location: /path/to/midnight-smoker/example/plugin-reporter/fixtures/plugin-reporter-fail

> plugin-reporter-ok@1.0.0 start
> smoker

......
```

## How it Works

While this package's organization is somewhat unorthodox, what we have is:

- A plugin in the workspace root, exported by `index.js`
- Two (2) workspaces in the `fixtures` directory:
  - `plugin-rule-fail`: A package which fails a builtin rule (`no-missing-entry-point`)
  - `plugin-rule-ok`: A package which passes all builtin rules

The workspace root has a `start` script which invokes the `start` script of each workspace.

[midnight-smoker]: https://github.com/midnight-smoker
