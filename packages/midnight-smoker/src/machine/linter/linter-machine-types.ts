import {type ActorOutputError, type ActorOutputOk} from '#machine/util';
import {type PkgManager} from '#pkg-manager';
import {
  type BaseNormalizedRuleOptionsRecord,
  type RuleContext,
  type RuleResultFailed,
  type RuleResultOk,
  type SomeRule,
} from '#rule';
import {
  type LintManifest,
  type LintManifests,
  type LintResult,
  type WorkspaceInfo,
} from '#schema';
import {type FileManager} from '#util/filemanager';
import {type PackageJson} from 'type-fest';
import {type ActorRefFrom, type AnyActorRef} from 'xstate';
import {type RuleMachine} from './rule-machine';

export interface LinterMachineInput {
  ruleConfigs: BaseNormalizedRuleOptionsRecord;
  rules: SomeRule[];
  pkgManager: PkgManager;
  lintManifests: LintManifests;
  workspaceInfo: WorkspaceInfo[];
  parentRef: AnyActorRef;

  fileManager: FileManager;

  index: number;
}

export interface LinterMachineContext extends LinterMachineInput {
  lintManifestsWithPkgs: LintManifestWithPkg[];
  ruleContexts: Readonly<RuleContext>[];
  passed: RuleResultOk[];
  issues: RuleResultFailed[];

  ruleMachines: Record<string, ActorRefFrom<typeof RuleMachine>>;
  error?: Error;
}

export type ReadPkgJsonsInput = Pick<
  LinterMachineContext,
  'fileManager' | 'lintManifests'
>;

export interface LintManifestWithPkg extends LintManifest {
  pkgJson: PackageJson;
  pkgJsonPath: string;
}

export type LinterMachineOutputOk = ActorOutputOk<{
  lintResult: LintResult;
  pkgManagerIndex: number;
  workspaceInfo: WorkspaceInfo[];
  pkgManager: PkgManager;
  didFail: boolean;
}>;

export type LinterMachineOutputError = ActorOutputError<
  Error,
  {
    pkgManager: PkgManager;
    workspaceInfo: WorkspaceInfo[];
  }
>;

export type LinterMachineOutput =
  | LinterMachineOutputOk
  | LinterMachineOutputError;
