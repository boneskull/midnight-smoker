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

  onPkgManagerPackBegin: ReporterListener<
    typeof SmokerEvent.PkgManagerPackBegin,
    Ctx
  >;
  onPkgManagerPackFailed: ReporterListener<
    typeof SmokerEvent.PkgManagerPackFailed,
    Ctx
  >;
  onPkgManagerPackOk: ReporterListener<
    typeof SmokerEvent.PkgManagerPackOk,
    Ctx
  >;

  onInstallBegin: ReporterListener<typeof SmokerEvent.InstallBegin, Ctx>;
  onInstallFailed: ReporterListener<typeof SmokerEvent.InstallFailed, Ctx>;
  onInstallOk: ReporterListener<typeof SmokerEvent.InstallOk, Ctx>;

  onPkgManagerInstallBegin: ReporterListener<
    typeof SmokerEvent.PkgManagerInstallBegin,
    Ctx
  >;
  onPkgManagerInstallFailed: ReporterListener<
    typeof SmokerEvent.PkgManagerInstallFailed,
    Ctx
  >;
  onPkgManagerInstallOk: ReporterListener<
    typeof SmokerEvent.PkgManagerInstallOk,
    Ctx
  >;

  onRuleBegin: ReporterListener<typeof SmokerEvent.RuleBegin, Ctx>;
  onRuleError: ReporterListener<typeof SmokerEvent.RuleError, Ctx>;
  onRuleFailed: ReporterListener<typeof SmokerEvent.RuleFailed, Ctx>;
  onRuleOk: ReporterListener<typeof SmokerEvent.RuleOk, Ctx>;
  onLintBegin: ReporterListener<typeof SmokerEvent.LintBegin, Ctx>;
  onLintFailed: ReporterListener<typeof SmokerEvent.LintFailed, Ctx>;
  onLintOk: ReporterListener<typeof SmokerEvent.LintOk, Ctx>;

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
  [`on${SmokerEvent.PackBegin}` as const]: SmokerEvent.PackBegin,
  [`on${SmokerEvent.PackFailed}` as const]: SmokerEvent.PackFailed,
  [`on${SmokerEvent.PackOk}` as const]: SmokerEvent.PackOk,
  [`on${SmokerEvent.PkgManagerPackBegin}` as const]:
    SmokerEvent.PkgManagerPackBegin,
  [`on${SmokerEvent.PkgManagerPackFailed}` as const]:
    SmokerEvent.PkgManagerPackFailed,
  [`on${SmokerEvent.PkgManagerPackOk}` as const]: SmokerEvent.PkgManagerPackOk,
  [`on${SmokerEvent.InstallBegin}` as const]: SmokerEvent.InstallBegin,
  [`on${SmokerEvent.InstallFailed}` as const]: SmokerEvent.InstallFailed,
  [`on${SmokerEvent.InstallOk}` as const]: SmokerEvent.InstallOk,
  [`on${SmokerEvent.PkgManagerInstallBegin}` as const]:
    SmokerEvent.PkgManagerInstallBegin,
  [`on${SmokerEvent.PkgManagerInstallFailed}` as const]:
    SmokerEvent.PkgManagerInstallFailed,
  [`on${SmokerEvent.PkgManagerInstallOk}` as const]:
    SmokerEvent.PkgManagerInstallOk,
  [`on${SmokerEvent.RuleBegin}` as const]: SmokerEvent.RuleBegin,
  [`on${SmokerEvent.RuleError}` as const]: SmokerEvent.RuleError,
  [`on${SmokerEvent.RuleFailed}` as const]: SmokerEvent.RuleFailed,
  [`on${SmokerEvent.RuleOk}` as const]: SmokerEvent.RuleOk,
  [`on${SmokerEvent.LintBegin}` as const]: SmokerEvent.LintBegin,
  [`on${SmokerEvent.LintFailed}` as const]: SmokerEvent.LintFailed,
  [`on${SmokerEvent.LintOk}` as const]: SmokerEvent.LintOk,
  [`on${SmokerEvent.RunScriptBegin}` as const]: SmokerEvent.RunScriptBegin,
  [`on${SmokerEvent.RunScriptFailed}` as const]: SmokerEvent.RunScriptFailed,
  [`on${SmokerEvent.RunScriptOk}` as const]: SmokerEvent.RunScriptOk,
  [`on${SmokerEvent.RunScriptsBegin}` as const]: SmokerEvent.RunScriptsBegin,
  [`on${SmokerEvent.RunScriptsFailed}` as const]: SmokerEvent.RunScriptsFailed,
  [`on${SmokerEvent.RunScriptsOk}` as const]: SmokerEvent.RunScriptsOk,
  [`on${SmokerEvent.BeforeExit}` as const]: SmokerEvent.BeforeExit,
  [`on${SmokerEvent.Lingered}` as const]: SmokerEvent.Lingered,
  [`on${SmokerEvent.SmokeBegin}` as const]: SmokerEvent.SmokeBegin,
  [`on${SmokerEvent.SmokeFailed}` as const]: SmokerEvent.SmokeFailed,
  [`on${SmokerEvent.SmokeOk}` as const]: SmokerEvent.SmokeOk,
  [`on${SmokerEvent.UnknownError}` as const]: SmokerEvent.UnknownError,
} as const satisfies Record<keyof ReporterListeners, EventKind>;

export type ReporterListenerName = keyof typeof ReporterListenerEventMap;
