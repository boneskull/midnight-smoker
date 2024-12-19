import {type AnyInstallMachineEvent} from './install';
import {type SmokeMachineLingeredEvent} from './lingered';
import {type SmokeMachineLintEvent} from './lint';
import {type AnyPackMachineEvent} from './pack';
import {type SmokeMachineScriptEvent} from './script';

export type AnyPkgManagerMachineEvent =
  | AnyInstallMachineEvent
  | AnyPackMachineEvent
  | SmokeMachineLingeredEvent
  | SmokeMachineLintEvent
  | SmokeMachineScriptEvent;
