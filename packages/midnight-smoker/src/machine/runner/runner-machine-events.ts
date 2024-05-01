import {type RunScriptManifest} from '#schema';
import {type RunMachineOutput} from './run-machine-types';

export interface RunnerMachineRunMachineDoneEvent {
  type: 'xstate.done.actor.RunMachine.*';
  output: RunMachineOutput;
}

export interface RunnerMachineRunScriptBeginEvent {
  type: 'RUN_SCRIPT_BEGIN';
  index: number;
  runScriptManifest: RunScriptManifest;
}

export type RunnerMachineEvents =
  | RunnerMachineRunMachineDoneEvent
  | RunnerMachineRunScriptBeginEvent;
