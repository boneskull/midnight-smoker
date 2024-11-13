import {error, info, warning} from 'log-symbols';
import {FAILED, MIDNIGHT_SMOKER} from 'midnight-smoker/constants';
import {type Reporter} from 'midnight-smoker/reporter';
import {
  type Issue,
  RuleSeverities,
  type StaticRule,
} from 'midnight-smoker/rule';
import {
  hrRelativePath,
  isBlessedPlugin,
  isEmpty,
  joinLines,
  R,
} from 'midnight-smoker/util';
import pluralize from 'pluralize';
import {type LiteralUnion} from 'type-fest';

const ELLIPSIS = '…';

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * Mapping of single-digit integers to English words
 */
const NUM_WORDS = new Map([
  [0, 'zero'],
  [1, 'one'],
  [2, 'two'],
  [3, 'three'],
  [4, 'four'],
  [5, 'five'],
  [6, 'six'],
  [7, 'seven'],
  [8, 'eight'],
  [9, 'nine'],
] as const);

/**
 * Converts a number to an English word, or returns the number as a string if it
 * doesn't exist in {@link NUM_WORDS}
 *
 * @param num - Number to convert
 * @returns English word for `num`, or `num` as a string
 */
function numberToString(num: LiteralUnion<Digit, number>) {
  return NUM_WORDS.get(num as Digit) ?? String(num);
}

/**
 * Wrap {@link pluralize} with {@link numberToString} and the integer in parens
 *
 * @param str - String to pluralize
 * @param count - Count
 * @param withNumber - Whether to show the number
 * @returns A nice string
 */
function plural(str: string, count: number, withNumber = false) {
  return withNumber
    ? `${numberToString(count)} (${count}) ${pluralize(str, count)}`
    : pluralize(str, count);
}

/**
 * Given the name of a thing and optionally a version, return a fancy string
 *
 * @param name Name
 * @param version Version
 * @returns `name@version` with some colors
 */
function nameAndVersion(name: string, version?: string) {
  return version ? `${name}@${version}` : name;
}

function pkgManager(label: string) {
  const parts = label.split('@');
  if (parts.length === 1) {
    return parts[0];
  }
  const other = parts[1]!.split(' ');
  if (other.length === 1) {
    return `${parts[0]}@${parts[1]}`;
  }
  return `${parts[0]}@${other[0]} ${other[1]}`;
}

const ruleNameError = (rule: StaticRule) => `[${rule.name}]`;
const ruleNameWarning = (rule: StaticRule) => `[${rule.name}]`;

export const SimpleReporter: Reporter = {
  description: 'Simple reporter (for non-TTY)',
  name: 'simple',
  onAborted() {
    console.error('ABORT');
  },
  onInstallFailed({opts}, {error: err}) {
    console.error(err.format(opts.verbose));
  },
  onLingered(_, {directories: dirs}) {
    console.error(
      `${warning} Lingering ${plural('temp directory', dirs.length)}:\n`,
    );
    for (const dir of dirs) {
      console.error(dir);
    }
  },
  onLintFailed(_, {results: lintResults}) {
    for (const {pkgName, results} of lintResults) {
      const failed = results.filter(({type}) => type === FAILED) as Issue[];
      const lines = [
        `${plural('Issue', failed.length)} found in package ${pkgName}:`,
      ];
      const isError = failed.some(
        ({ctx: {severity}}) => severity === RuleSeverities.Error,
      );

      const failedByFilepath = R.groupBy(
        failed,
        ({ctx: {pkgJsonPath}, filepath}) => filepath ?? pkgJsonPath,
      );

      for (const [filepath, failed] of Object.entries(failedByFilepath)) {
        lines.push(`│ ${hrRelativePath(filepath)}:`);
        for (const {
          ctx: {severity},
          message,
          rule,
        } of failed) {
          if (severity === RuleSeverities.Error) {
            lines.push(`│   ${error} ${ruleNameError(rule)} — ${message}`);
          } else {
            lines.push(`│   ${warning} ${ruleNameWarning(rule)} — ${message}`);
          }
        }
      }

      const msg = joinLines(lines);
      if (isError) {
        console.error(`ERROR: ${msg}`);
      } else {
        console.error(`WARN: ${msg}`);
      }
    }
  },
  onPackFailed({opts}, {error: err}) {
    console.error(err.format(opts.verbose));
  },
  onRuleError(_, {error}) {
    console.error(error.message);
  },
  onScriptsFailed({opts}, {results}) {
    for (const result of results) {
      if (result.type === FAILED) {
        // TODO: this is not verbose enough
        const details = result.error.format(opts.verbose);
        console.error(
          `WARN: Script execution failure details for package ${result.manifest.pkgName}:\n- ${details}\n`,
        );
      }
    }
  },
  onSmokeBegin(
    {pkgJson},
    {pkgManagers, plugins, smokerOptions, workspaceInfo},
  ) {
    console.error(`${nameAndVersion(MIDNIGHT_SMOKER, pkgJson.version)}\n`);
    const extPlugins = plugins.filter(({id}) => !isBlessedPlugin(id));
    if (extPlugins.length) {
      console.error(
        'Loaded %s: %s',
        plural('external plugin', extPlugins.length, true),
        extPlugins
          .map(({id, version}) => nameAndVersion(id, version))
          .join(', '),
      );
    }

    const allRuleNames = new Set(plugins.flatMap(({ruleNames}) => ruleNames));
    const enabledRuleCount = Object.entries(smokerOptions.rules)
      .filter(
        ([ruleName, {severity}]) =>
          severity !== RuleSeverities.Off && allRuleNames.has(ruleName),
      )
      .map(([ruleName]) => ruleName).length;

    // TODO: I don't love how this looks
    const planLintText = `lint using ${plural('rule', enabledRuleCount, true)}`;
    const scriptLintText = `'run' ${plural(
      'script',
      smokerOptions.script.length,
      true,
    )}`;

    const planOperation =
      smokerOptions.lint && !isEmpty(smokerOptions.script)
        ? `${planLintText} and ${scriptLintText}`
        : smokerOptions.lint
          ? planLintText
          : scriptLintText;

    let msg = `Plan: ${planOperation} in `;
    if (workspaceInfo.length > 1) {
      msg += plural('workspace', workspaceInfo.length, true);
    } else {
      msg += R.first(workspaceInfo)!.pkgName;
    }
    if (pkgManagers.length > 1) {
      msg += ` using ${plural('package manager', pkgManagers.length, true)}`;
    } else {
      msg += ` using ${pkgManager(R.first(pkgManagers)!.label)}`;
    }

    console.error(`${info} ${msg}\n`);
    console.error(`Smokin'${ELLIPSIS}`);
  },
  onSmokeError({opts: {verbose}}, {error}) {
    console.error(error.format(verbose));
  },
  onSmokeFailed() {
    console.error('Maurice!');
  },
  onSmokeOk() {
    console.error('Lovey-dovey!');
  },
};
