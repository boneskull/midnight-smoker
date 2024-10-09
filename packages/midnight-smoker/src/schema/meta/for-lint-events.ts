export type {
  CheckOk as CheckResultOk,
  Issue as CheckResultFailed,
} from '#rule/issue';

export {type LintManifest} from '#rule/lint-manifest';

export {type LintResult, type LintResultOk} from '#rule/lint-result';

export {
  type BaseRuleConfigRecord,
  type SomeRuleConfig,
} from '#schema/rule-options';

export {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';

export {type WorkspaceInfo} from '#schema/workspace-info';
