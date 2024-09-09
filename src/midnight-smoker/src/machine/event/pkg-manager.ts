import {type SmokeMachineInstallEvent} from './install.js';
import {type SmokeMachineLingeredEvent} from './lingered.js';
import {type SmokeMachineLintEvent} from './lint.js';
import {type SmokeMachinePackEvent} from './pack.js';
import {type SmokeMachineScriptEvent} from './script.js';

export type SmokeMachinePkgManagerEvent =
  | SmokeMachineInstallEvent
  | SmokeMachineLingeredEvent
  | SmokeMachineLintEvent
  | SmokeMachinePackEvent
  | SmokeMachineScriptEvent;
