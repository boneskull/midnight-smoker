import {SmokerEvent} from '#event';
import {type SmokerOptions} from '#options';
import {type InstallEventData} from '#schema/install-event';
import {type PackEventData} from '#schema/pack-event';
import {type RuleEventData} from '#schema/rule-runner-event';
import {type ScriptEventData} from '#schema/script-runner-event';
import {type SmokerEventData} from '#schema/smoker-event';
import {type PackageJson} from 'type-fest';

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

export type ReporterContext<Ctx> = {
  console: Console;
  opts: SmokerOptions;
  pkgJson: PackageJson;
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
} & Ctx;

export type EventData<T extends EventKind = EventKind> = {
  [K in T]: {event: K} & AllEventData[K];
}[T];

export type AllEventData = SmokerEventData &
  InstallEventData &
  PackEventData &
  ScriptEventData &
  RuleEventData;

export type EventKind = keyof AllEventData;

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

export interface ReporterDef<Ctx = unknown>
  extends Partial<ReporterListeners<Ctx>> {
  description: string;
  isHidden?: boolean;
  name: string;
  stderr?: ReporterStream;
  stdout?: ReporterStream;
  when?: ReporterWhenCallback;
  setup?: ReporterSetupFn<Ctx>;
  teardown?: ReporterTeardownFn<Ctx>;
}

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
} as const;

export type ReporterListenerName = keyof typeof ReporterListenerEventMap;
