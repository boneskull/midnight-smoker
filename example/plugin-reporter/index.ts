import type {PluginFactory} from 'midnight-smoker/plugin';

export const plugin: PluginFactory = (api) => {
  const {SmokerEvent} = api.Event;

  const dot = () => {
    process.stderr.write('.');
  };

  const bang = () => {
    process.stderr.write('!');
  };

  api.defineReporter({
    /**
     * The name of the rule. This will be unique to the plugin.
     *
     * In a user's config file, it will be referenced as
     * `<plugin-name>/<rule-name>`.
     *
     * The plugin name will be the package name from the closest ancestor
     * `package.json`.
     */
    name: 'dot',

    /**
     * Rule description.
     *
     * This is required.
     */
    description: 'The ubiquitous "dot" reporter',

    /**
     * `true` is the default value for this property.
     *
     * The only thing that this property does is tell the `list-reporters`
     * command of `smoker` whether or not to list this reporter.
     */
    isReporter: true,

    /**
     * The `reporter` function receives an `EventEmitter`-like object.
     *
     * @param emitter - Event emitter
     * @param opts - Entire options object for `midnight-smoker`
     * @param pkgJson - `midnight-smoker`'s own `package.json`, in case you need
     *   something in there
     */
    reporter(emitter, opts, pkgJson) {
      emitter
        .once(SmokerEvent.PackOk, dot)
        .once(SmokerEvent.PackFailed, bang)
        .once(SmokerEvent.InstallOk, dot)
        .once(SmokerEvent.InstallFailed, bang)
        .on(SmokerEvent.RunRuleOk, dot)
        .on(SmokerEvent.RunRuleFailed, bang)
        .on(SmokerEvent.RunScriptOk, dot)
        .on(SmokerEvent.RunScriptFailed, bang)
        .once(SmokerEvent.End, () => {
          console.error(); // for the newline
        });
    },
  });
};
