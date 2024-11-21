export {
  type InstallManifest,
  type WorkspaceInstallManifest,
} from '#defs/pkg-manager';

export {
  type PkgManager,
  type PkgManagerContext,
  type PkgManagerOpts,
} from '#defs/pkg-manager';

export {type RunScriptManifest} from '#defs/pkg-manager';

export {type StaticPluginMetadata} from '#defs/plugin';

export {type SomeRule} from '#defs/rule';

export {type CheckResult} from '#rule/issue';

export type {CheckOk, Issue} from '#rule/issue';

export {type LintManifest} from '#rule/lint-manifest';

export {
  type LintResult,
  type LintResultFailed,
  type LintResultOk,
} from '#rule/lint-result';

export {type StaticRuleContext} from '#rule/static-rule-context';

export {type BaseRuleConfigRecord} from '#schema/lint/rule-options';

export {type SomeRuleConfig} from '#schema/lint/rule-options';

export {type InstallResult} from '#schema/pkg-manager/install-result';

export {PkgManagerContextSchema} from '#schema/pkg-manager/pkg-manager';

export {type RunScriptResult} from '#schema/pkg-manager/run-script-result';

export {type ScriptError} from '#schema/pkg-manager/script-error';

export {type StaticPkgManagerSpec} from '#schema/pkg-manager/static-pkg-manager-spec';

export {type WorkspaceInfo} from '#schema/workspace-info';
