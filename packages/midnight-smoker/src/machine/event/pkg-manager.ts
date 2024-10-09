import {type SmokeMachineInstallEvent} from './install';
import {type SmokeMachineLingeredEvent} from './lingered';
import {type SmokeMachineLintEvent} from './lint';
import {type SmokeMachinePackEvent} from './pack';
import {type SmokeMachineScriptEvent} from './script';

export type SmokeMachinePkgManagerEvent =
  | SmokeMachineInstallEvent
  | SmokeMachineLingeredEvent
  | SmokeMachineLintEvent
  | SmokeMachinePackEvent
  | SmokeMachineScriptEvent;
