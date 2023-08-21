import noBannedFiles from './no-banned-files';
import noMissingEntryPoint from './no-missing-entry-point';
import noMissingExports from './no-missing-exports';
import noMissingPkgFiles from './no-missing-pkg-files';
export const BuiltinRules = {
  [noMissingPkgFiles.name]: noMissingPkgFiles,
  [noBannedFiles.name]: noBannedFiles,
  [noMissingEntryPoint.name]: noMissingEntryPoint,
  [noMissingExports.name]: noMissingExports,
} as const;

export const BuiltinRuleConts = [
  noMissingPkgFiles.toRuleCont(),
  noBannedFiles.toRuleCont(),
  noMissingEntryPoint.toRuleCont(),
  noMissingExports.toRuleCont(),
];
