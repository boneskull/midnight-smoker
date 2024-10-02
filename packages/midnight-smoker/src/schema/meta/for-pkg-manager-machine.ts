export {type StaticPluginMetadata} from '#plugin/static-plugin-metadata';

export {type CheckResult} from '#rule/issue';

export {
  type Issue as CheckResultFailed,
  type CheckOk as CheckResultOk,
} from '#rule/issue';

export {type LintManifest} from '#rule/lint-manifest';

export {
  type LintResult,
  type LintResultFailed,
  type LintResultOk,
} from '#rule/lint-result';

export {type StaticRuleContext} from '#rule/static-rule-context';

export {
  type InstallManifest,
  type WorkspaceInstallManifest,
} from '#schema/install-manifest';

export {type InstallResult} from '#schema/install-result';

export {
  PkgManagerContextSchema,
  type PkgManager,
  type PkgManagerContext,
  type PkgManagerOpts,
} from '#schema/pkg-manager';

export {type SomeRule} from '#schema/rule';

export {type BaseRuleConfigRecord} from '#schema/rule-options';

export {type SomeRuleConfig} from '#schema/rule-options';

export {type RunScriptManifest} from '#schema/run-script-manifest';

export {type RunScriptResult} from '#schema/run-script-result';

export {type ScriptError} from '#schema/script-error';

export {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';

export {type WorkspaceInfo} from '#schema/workspace-info';
