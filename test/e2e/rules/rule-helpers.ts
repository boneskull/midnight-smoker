import path from 'node:path';
import fs from 'node:fs';
import {PackedPackage, Smoker} from '../../../src';
import {RawRuleConfig} from '../../../src/rules/rule-config';
import {RuleCont} from '../../../src/rules/rule';
import {EventEmitter} from 'node:events';
import {BuiltinRuleConts} from '../../../src/rules/builtin';

export function setupRuleTest(fixtureName: string, config: RawRuleConfig = {}) {
  const ruleConfig = config;
  const installPath = path.join(__dirname, 'fixture', fixtureName);
  try {
    fs.statSync(installPath);
  } catch {
    throw new Error(`Fixture "${fixtureName}" not found`);
  }
  const pkg: PackedPackage = {
    pkgName: '',
    installPath,
    tarballFilepath: '',
  };
  return {ruleConfig, pkg};
}

export async function applyRules(
  config: RawRuleConfig,
  {installPath: pkgPath}: PackedPackage,
  ruleCont: RuleCont,
) {
  return Smoker.prototype.runCheck.call(
    new EventEmitter(),
    ruleCont,
    pkgPath,
    config,
  );
}
