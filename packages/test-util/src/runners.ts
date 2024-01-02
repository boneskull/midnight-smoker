import {EventEmitter} from 'events';
import {
  Event,
  PluginRegistry,
  Rule,
  RuleFilter,
  RuleRunner,
  SchemaUtils,
  ScriptRunner,
} from 'midnight-smoker/plugin';

/**
 * Options for running a rule runner.
 */
export interface RunRuleRunnerOpts {
  /**
   * The rules to run. If not provided, all rules will be run. If `filter`
   * provided, this is ignored.
   */
  rules?: string[];

  /**
   * The configuration options for the rules to run. If not provided, the
   * default configuration will be used.
   */
  config?: Rule.BaseRuleOptionsRecord;

  /**
   * The event emitter to use for emitting events (via the notifier functions).
   * If not provided, a new `EventEmitter` will be created.
   */
  emitter?: EventEmitter;
  /**
   * Filter the rules to run (e.g., only those that are not disabled)
   */
  filter?: RuleFilter;
}

/**
 * Runs the provided rule runner with the given manifest and options.
 *
 * The {@link RuleRunner} _and_ the rules must be registered with the provided
 * {@link PluginRegistry}.
 *
 * @param ruleRunner - The rule runner function to execute.
 * @param registry - Plugin registry.
 * @param manifest - The manifest containing information about the rules to run.
 * @param opts - The optional configuration options for running the rule runner.
 * @returns A promise that resolves when the rule runner has completed.
 */
export async function runRuleRunner(
  ruleRunner: RuleRunner.RuleRunner,
  registry: PluginRegistry,
  manifest: RuleRunner.RunRulesManifest,
  opts: RunRuleRunnerOpts = {},
): Promise<RuleRunner.RunRulesResult> {
  const notifiers = RuleRunner.createRuleRunnerNotifiers(
    (opts.emitter ??
      new EventEmitter()) as Event.StrictEmitter<Event.RuleEvents>,
  );

  const filter: RuleFilter = opts.filter
    ? opts.filter
    : opts.rules
      ? (rule) => Boolean(opts.rules?.includes(rule.name))
      : () => true;
  return ruleRunner(
    notifiers,
    registry.getRules(filter),
    opts.config ?? registry.mergeRuleDefaults(),
    manifest,
  );
}

/**
 * Options for running a {@link ScriptRunner}.
 */
export interface RunScriptRunnerOpts
  extends Partial<ScriptRunner.ScriptRunnerOpts> {
  /**
   * The event emitter to use for emitting events (via the notifier functions).
   * If not provided, a new `EventEmitter` will be created.
   */
  emitter?: EventEmitter;
}

export async function runScriptRunner(
  scriptRunner: ScriptRunner.ScriptRunner,
  brokerRunManifest:
    | ScriptRunner.PkgManagerRunScriptManifest[]
    | ScriptRunner.PkgManagerRunScriptManifest,
  opts: RunScriptRunnerOpts = {},
) {
  brokerRunManifest = SchemaUtils.castArray(brokerRunManifest);
  const {emitter, ...scriptRunnerOpts} = opts;
  const notifiers = ScriptRunner.createScriptRunnerNotifiers(
    (emitter ??
      new EventEmitter()) as Event.StrictEmitter<Event.ScriptRunnerEvents>,
    brokerRunManifest.length,
  );

  let signal: AbortSignal;
  let ac: AbortController | undefined;
  if (!opts.signal) {
    ac = new AbortController();
    signal = ac.signal;
  } else {
    signal = opts.signal;
  }

  try {
    return await Promise.all(
      brokerRunManifest.map((manifest) =>
        scriptRunner(notifiers, manifest, {...scriptRunnerOpts, signal}),
      ),
    );
  } finally {
    ac?.abort();
  }
}
