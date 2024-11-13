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
     * The name of the reporter; this is unique to the plugin.
     */
    name: 'dot',

    /**
     * Rule description; required.
     */
    description: 'The ubiquitous "dot" reporter',

    /**
     * The `reporter` function receives an `EventEmitter`-like object.
     *
     * @param emitter - Event emitter
     * @param opts - Entire options object for `midnight-smoker`
     * @param pkgJson - `midnight-smoker`'s own `package.json`, in case you need
     *   something in there
     */
    reporter({emitter}) {
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
