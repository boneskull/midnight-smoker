import {SmokerEvent} from '#event';
import {type SmokerOptions} from '#options';
import {type EventData, type EventKind} from '#schema/smoker-event';
import {type PackageJson} from 'type-fest';

/**
 * The type of a stream, as in a {@link ReporterDef}.
 *
 * @todo Evaluate if the methods are necessary
 */
export type ReporterStream =
  | NodeJS.WritableStream
  | (() => NodeJS.WritableStream)
  | (() => Promise<NodeJS.WritableStream>);

/**
 * Before instantiation of `Smoker`, this callback will be executed with a
 * `SmokerOptions` object. If this returns `true`, the reporter will be used. If
 * it returns `false`, it will not be used.
 *
 * Use this to automatically enable or disable itself based on options passed to
 * `Smoker`. **Do not use this to strip users of agency.**
 */
export type ReporterWhenCallback = (opts: Readonly<SmokerOptions>) => boolean;

/**
 * The reporter context is like a `this`, but it's passed as an argument.
 *
 * The context has some base properties that are always available, and the
 * implementor can define extra properties as desired.
 *
 * Functions in a {@link ReporterDef} have no context.
 */
export type ReporterContext<Ctx = unknown> = {
  console: Console;
  opts: SmokerOptions;
  pkgJson: PackageJson;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
} & Ctx;

export type ReporterListener<Evt extends EventKind, Ctx = unknown> = (
  this: void,
  ctx: ReporterContext<Ctx>,
  data: EventData<Evt>,
) => void | Promise<void>;

export type ReporterSetupFn<Ctx = unknown> = (
  ctx: ReporterContext<Ctx>,
) => void | Promise<void>;

export type ReporterTeardownFn<Ctx = unknown> = (
  ctx: ReporterContext<Ctx>,
) => void | Promise<void>;

/**
 * All of the functions which a reporter can implement which map to events
 * raised by `midnight-smoker`.
 */
export interface ReporterListeners<Ctx = unknown> {
  onPackBegin: ReporterListener<typeof SmokerEvent.PackBegin, Ctx>;
  onPackFailed: ReporterListener<typeof SmokerEvent.PackFailed, Ctx>;
  onPackOk: ReporterListener<typeof SmokerEvent.PackOk, Ctx>;

  onInstallBegin: ReporterListener<typeof SmokerEvent.InstallBegin, Ctx>;
  onInstallFailed: ReporterListener<typeof SmokerEvent.InstallFailed, Ctx>;
  onInstallOk: ReporterListener<typeof SmokerEvent.InstallOk, Ctx>;

  onRunRuleBegin: ReporterListener<typeof SmokerEvent.RunRuleBegin, Ctx>;
  onRuleError: ReporterListener<typeof SmokerEvent.RuleError, Ctx>;
  onRunRuleFailed: ReporterListener<typeof SmokerEvent.RunRuleFailed, Ctx>;
  onRunRuleOk: ReporterListener<typeof SmokerEvent.RunRuleOk, Ctx>;
  onRunRulesBegin: ReporterListener<typeof SmokerEvent.RunRulesBegin, Ctx>;
  onRunRulesFailed: ReporterListener<typeof SmokerEvent.RunRulesFailed, Ctx>;
  onRunRulesOk: ReporterListener<typeof SmokerEvent.RunRulesOk, Ctx>;

  onRunScriptBegin: ReporterListener<typeof SmokerEvent.RunScriptBegin, Ctx>;
  onRunScriptFailed: ReporterListener<typeof SmokerEvent.RunScriptFailed, Ctx>;
  onRunScriptOk: ReporterListener<typeof SmokerEvent.RunScriptOk, Ctx>;
  onRunScriptsBegin: ReporterListener<typeof SmokerEvent.RunScriptsBegin, Ctx>;
  onRunScriptsFailed: ReporterListener<
    typeof SmokerEvent.RunScriptsFailed,
    Ctx
  >;
  onRunScriptsOk: ReporterListener<typeof SmokerEvent.RunScriptsOk, Ctx>;

  onBeforeExit: ReporterListener<typeof SmokerEvent.BeforeExit, Ctx>;
  onLingered: ReporterListener<typeof SmokerEvent.Lingered, Ctx>;
  onSmokeBegin: ReporterListener<typeof SmokerEvent.SmokeBegin, Ctx>;
  onSmokeFailed: ReporterListener<typeof SmokerEvent.SmokeFailed, Ctx>;
  onSmokeOk: ReporterListener<typeof SmokerEvent.SmokeOk, Ctx>;
  onUnknownError: ReporterListener<typeof SmokerEvent.UnknownError, Ctx>;
}

/**
 * A reporter definition, as provided by a plugin author.
 */
export interface ReporterDef<Ctx = unknown>
  extends Partial<ReporterListeners<Ctx>> {
  /**
   * Reporter description.
   *
   * Required
   */
  description: string;

  /**
   * If `true`, this reporter will be hidden from the list of reporters.
   */
  isHidden?: boolean;

  /**
   * Reporter name.
   *
   * Required
   */
  name: string;

  /**
   * Custom `stderr` stream or callback to provide one.
   */
  stderr?: ReporterStream;

  /**
   * Custom `stdout` stream or callback to provide one.
   */
  stdout?: ReporterStream;

  /**
   * Before instantiation of `Smoker`, this callback will be executed with a
   * `SmokerOptions` object. If this returns `true`, the reporter will be used.
   * If it returns `false`, it will not be used.
   *
   * Use this to automatically enable or disable itself based on options passed
   * to `Smoker`. **Do not use this to strip users of agency.**
   */
  when?: ReporterWhenCallback;

  /**
   * Setup function; called before `Smoker` emits any events
   */
  setup?: ReporterSetupFn<Ctx>;

  /**
   * Teardown function; called just before `Smoker` exits
   */
  teardown?: ReporterTeardownFn<Ctx>;
}

/**
 * Mapping of {@link ReporterListener} props to their corresponding
 * {@link SmokerEvent events}.
 */
export const ReporterListenerEventMap = {
  onPackBegin: SmokerEvent.PackBegin,
  onPackFailed: SmokerEvent.PackFailed,
  onPackOk: SmokerEvent.PackOk,
  onInstallBegin: SmokerEvent.InstallBegin,
  onInstallFailed: SmokerEvent.InstallFailed,
  onInstallOk: SmokerEvent.InstallOk,
  onRunRuleBegin: SmokerEvent.RunRuleBegin,
  onRuleError: SmokerEvent.RuleError,
  onRunRuleFailed: SmokerEvent.RunRuleFailed,
  onRunRuleOk: SmokerEvent.RunRuleOk,
  onRunRulesBegin: SmokerEvent.RunRulesBegin,
  onRunRulesFailed: SmokerEvent.RunRulesFailed,
  onRunRulesOk: SmokerEvent.RunRulesOk,
  onRunScriptBegin: SmokerEvent.RunScriptBegin,
  onRunScriptFailed: SmokerEvent.RunScriptFailed,
  onRunScriptOk: SmokerEvent.RunScriptOk,
  onRunScriptsBegin: SmokerEvent.RunScriptsBegin,
  onRunScriptsFailed: SmokerEvent.RunScriptsFailed,
  onRunScriptsOk: SmokerEvent.RunScriptsOk,
  onBeforeExit: SmokerEvent.BeforeExit,
  onLingered: SmokerEvent.Lingered,
  onSmokeBegin: SmokerEvent.SmokeBegin,
  onSmokeFailed: SmokerEvent.SmokeFailed,
  onSmokeOk: SmokerEvent.SmokeOk,
  onUnknownError: SmokerEvent.UnknownError,
} as const satisfies Record<keyof ReporterListeners, EventKind>;

export type ReporterListenerName = keyof typeof ReporterListenerEventMap;
