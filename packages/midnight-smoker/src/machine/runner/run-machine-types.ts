import {type ActorOutputError, type ActorOutputOk} from '#machine/util';
import {type PkgManager} from '#pkg-manager';
import {
  type RunScriptManifest,
  type RunScriptResult,
  type ScriptError,
} from '#schema';
import {type AnyActorRef} from 'xstate';

export interface RunMachineInput {
  pkgManager: PkgManager;
  runScriptManifest: RunScriptManifest;
  signal: AbortSignal;

  /**
   * Index of the script in the list of scripts to run _for a particular package
   * manager_.
   */
  index: number;

  parentRef: AnyActorRef;
}

export interface RunMachineContext extends RunMachineInput {
  result?: RunScriptResult;
  error?: ScriptError;
}

export interface RunMachineBaseOutput {}

export type RunMachineOutputOk = ActorOutputOk<{
  manifest: RunScriptManifest;
  scriptIndex: number;
  result: RunScriptResult;
}>;

export type RunMachineOutputError = ActorOutputError<ScriptError>;

export type RunMachineOutput = RunMachineOutputOk | RunMachineOutputError;

export type RunMachineRunScriptInput = Omit<
  RunMachineInput,
  'index' | 'parentRef'
>;
