import {type InstallError, type PackError, type PackParseError} from '#error';
import {type InstallEvents, type PackEvents, type ScriptEvents} from '#event';
import {type PkgManager} from '#pkg-manager';
import {
  type InstallManifest,
  type InstallResult,
  type PackOptions,
  type RunScriptManifest,
  type ScriptError,
  type StaticPkgManagerSpec,
} from '#schema';
import {type Simplify} from 'type-fest';
import {type PMMOutput} from '../pkg-manager/pkg-manager-machine';
import {type PluginLoaderOutput} from '../plugin-loader-machine';
import {
  type SRMOutputBailed,
  type SRMOutputError,
  type SRMOutputResult,
} from '../script-runner-machine';

export type CtrlEvents =
  | CtrlDidRunScriptBailedEvent
  | CtrlDidRunScriptErrorEvent
  | CtrlDidRunScriptResultEvent
  | CtrlDidRunScriptsEvent
  | CtrlHaltEvent
  | CtrlInitEvent
  | CtrlLoadedEvent
  | CtrlPkgManagerDoneEvent
  | CtrlPkgManagerInstallFailedEvent
  | CtrlPkgManagerInstallOkEvent
  | CtrlPkgManagerPackFailedEvent
  | CtrlPkgManagerPackOkEvent
  | CtrlPkgManagerWillInstallEvent
  | CtrlPkgManagerWillPackEvent
  | CtrlPluginLoaderDoneEvent
  | CtrlRunScriptFailedEvent
  | CtrlRunScriptsEvent
  | CtrlWillRunScriptEvent
  | CtrlWillRunScriptsEvent;

type SourceEvents = InstallEvents & PackEvents & ScriptEvents;

export type CtrlExternalEventsMap = {
  [K in keyof SourceEvents]: SourceEvents[K] & {type: K};
};

export type CtrlEmitted = CtrlExternalEventsMap[keyof CtrlExternalEventsMap];

export type CtrlExternalEvent<K extends keyof CtrlExternalEventsMap> = Simplify<
  CtrlExternalEventsMap[K]
>;

export interface CtrlDidRunScriptBailedEvent {
  output: SRMOutputBailed;
  type: 'DID_RUN_SCRIPT_BAILED';
}

export interface CtrlDidRunScriptErrorEvent {
  output: SRMOutputError;
  type: 'DID_RUN_SCRIPT_ERROR';
}

export interface CtrlDidRunScriptResultEvent {
  output: SRMOutputResult;
  type: 'DID_RUN_SCRIPT_RESULT';
}

export interface CtrlDidRunScriptsEvent {
  type: 'DID_RUN_SCRIPTS';
}

export interface CtrlHaltEvent {
  type: 'HALT';
}

export interface CtrlInitEvent {
  type: 'INIT';
}

export interface CtrlLoadedEvent {
  pkgManagers: PkgManager[];
  type: 'LOADED';
}

export interface CtrlPkgManagerDoneEvent {
  output: PMMOutput;
  type: 'xstate.done.actor.pkgManager.*';
}

export interface CtrlPkgManagerInstallOkEvent {
  index: number;
  installResult: InstallResult;
  pkgManager: StaticPkgManagerSpec;
  type: 'PKG_MANAGER_INSTALL_OK';
  sender: string;
}

export interface CtrlPkgManagerInstallFailedEvent {
  error: InstallError;
  index: number;
  pkgManager: StaticPkgManagerSpec;
  type: 'PKG_MANAGER_INSTALL_FAILED';
  sender: string;
}

export interface CtrlPkgManagerPackFailedEvent {
  error: PackError | PackParseError;
  index: number;
  pkgManager: StaticPkgManagerSpec;
  type: 'PKG_MANAGER_PACK_FAILED';
  sender: string;
}

export interface CtrlPkgManagerPackOkEvent {
  index: number;
  installManifests: InstallManifest[];
  pkgManager: StaticPkgManagerSpec;
  type: 'PKG_MANAGER_PACK_OK';

  sender: string;
}

export interface CtrlPkgManagerWillInstallEvent {
  index: number;
  pkgManager: StaticPkgManagerSpec;
  type: 'PKG_MANAGER_INSTALL';
}

export interface CtrlPkgManagerWillPackEvent extends PackOptions {
  index: number;
  pkgManager: StaticPkgManagerSpec;
  type: 'PKG_MANAGER_PACK';
}

export interface CtrlPluginLoaderDoneEvent {
  output: PluginLoaderOutput;
  type: 'xstate.done.actor.pluginLoader.*';
}

export interface CtrlRunScriptFailedEvent {
  current: number;
  error: ScriptError;
  runScriptManifest: RunScriptManifest;
  total: number;
  type: 'RUN_SCRIPT_FAILED';
}

export interface CtrlRunScriptsEvent {
  scripts: string[];
  type: 'RUN_SCRIPTS';
}

export interface CtrlWillRunScriptEvent {
  pkgManagerIndex: number;
  runScriptManifest: RunScriptManifest;
  scriptIndex: number;
  type: 'WILL_RUN_SCRIPT';
}

export interface CtrlWillRunScriptsEvent {
  pkgManagers: PkgManager[];
  scripts: string[];
  type: 'WILL_RUN_SCRIPTS';
}
