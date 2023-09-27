import {EventEmitter} from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import {PackedPackage, Smoker} from '../../../src';
import {RawCheckOptions, zCheckOptions} from '../../../src/rules/check-options';
import {RuleCont} from '../../../src/rules/rule';

export function setupRuleTest(
  fixtureName: string,
  config: RawCheckOptions = {},
) {
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
  return {ruleConfig: config, pkg};
}

export async function applyRules(
  config: RawCheckOptions,
  {installPath: pkgPath}: PackedPackage,
  ruleCont: RuleCont,
) {
  return Smoker.prototype.runCheck.call(
    new EventEmitter(),
    ruleCont,
    pkgPath,
    zCheckOptions.parse(config),
  );
}
