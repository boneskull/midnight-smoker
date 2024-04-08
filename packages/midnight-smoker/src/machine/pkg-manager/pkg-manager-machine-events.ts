import {type RunScriptManifest} from '../../component';
import {type SRMOutput} from '../script-runner-machine';

export type PMMEvents =
  | PMMInstallEvent
  | PMMSetupEvent
  | PMMRunScriptsEvent
  | PMMScriptRunnerDoneEvent
  | PMMHaltEvent
  | PMMWillRunScriptEvent;

export interface PMMHaltEvent {
  type: 'HALT';
}

export interface PMMInstallEvent {
  type: 'INSTALL';
}

export interface PMMRunScriptsEvent {
  scripts: string[];
  type: 'RUN_SCRIPTS';
}

export interface PMMScriptRunnerDoneEvent {
  output: SRMOutput;
  type: 'xstate.done.actor.scriptRunner.*';
}

export interface PMMSetupEvent {
  type: 'SETUP';
}

export interface PMMWillRunScriptEvent {
  index: number;
  runScriptManifest: RunScriptManifest;
  type: 'WILL_RUN_SCRIPT';
}
