import {type RunScriptManifest} from '#schema';
import {type RunMachineOutput} from './run-machine';

export interface RunMachineDoneEvent {
  type: 'xstate.done.actor.RunMachine.*';
  output: RunMachineOutput;
}

export interface RunMachineRunScriptBeginEvent {
  type: 'RUN_SCRIPT_BEGIN';
  index: number;
  runScriptManifest: RunScriptManifest;
}

export type RunnerMachineEvents =
  | RunMachineDoneEvent
  | RunMachineRunScriptBeginEvent;
