import {type NormalizedPackageJson} from '#schema/package-json';
import {type RuleSeverity} from '#schema/rule-severity';
import {type WorkspaceInfo} from '#schema/workspace-info';

/**
 * The bits of a {@link RuleContext} suitable for serialization.
 *
 * @privateRemarks
 * This is not user-provided and doesn't need a schema
 * @public
 */

export type StaticRuleContext = Readonly<{
  installPath: string;
  pkgJson: NormalizedPackageJson;
  pkgJsonPath: string;
  pkgManager: string;
  pkgName: string;
  ruleId: string;
  severity: RuleSeverity;
  workspace: WorkspaceInfo;
}>;
