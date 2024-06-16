import {
  blueBright,
  bold,
  cyanBright,
  dim,
  green,
  greenBright,
  italic,
  magentaBright,
  red,
  white,
  yellow,
} from 'chalk';
import spinners from 'cli-spinners';
import {groupBy, head, isEmpty, isError} from 'lodash';
import {error, info, warning} from 'log-symbols';
import {isBlessedPlugin} from 'midnight-smoker/plugin';
import {type ReporterDef} from 'midnight-smoker/reporter';
import {
  RuleSeverities,
  type CheckFailed,
  type StaticRuleDef,
} from 'midnight-smoker/rule';
import {hrRelativePath, randomItem} from 'midnight-smoker/util';
import ora, {type Ora} from 'ora';
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
    ? `${numberToString(count)} (${cyanBright(count)}) ${pluralize(str, count)}`
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
  return version ? `${name}${dim('@')}${white(version)}` : name;
}

function pkgManager(spec: string) {
  const parts = spec.split('@');
  if (parts.length === 1) {
    return green(parts[0]);
  }
  const other = parts[1].split(' ');
  if (other.length === 1) {
    return `${green(parts[0])}${dim('@')}${green(parts[1])}`;
  }
  return `${green(parts[0])}${dim('@')}${green(other[0])} ${dim(other[1])}`;
}

type ConsoleReporterContext = {
  spinner: Ora;
};

const spinnerMsgs = [
  `Jokin' and smokin'`,
  `Pickin' and grinnin'`,
  `Lovin' and sinnin'`,
  `Midnight tokin'`,
] as const;

export const ConsoleReporter: ReporterDef<ConsoleReporterContext> = {
  name: 'console',
  description: 'Default console reporter (for humans)',
  setup(ctx) {
    ctx.spinner = ora({spinner: spinners.random});
  },
  onSmokeBegin(
    {pkgJson, spinner},
    {plugins, workspaceInfo, pkgManagers, opts},
  ) {
    console.error(
      `💨 ${nameAndVersion(
        blueBright.bold('midnight-smoker'),
        pkgJson.version,
      )}\n`,
    );
    const extPlugins = plugins.filter(({id}) => !isBlessedPlugin(id));
    if (extPlugins.length) {
      console.error(
        '🔌 Loaded %s: %s',
        plural('external plugin', extPlugins.length, true),
        extPlugins
          .map(({id, version}) => nameAndVersion(greenBright(id), version))
          .join(', '),
      );
    }

    const allRuleNames = new Set(plugins.flatMap(({ruleNames}) => ruleNames));
    const enabledRuleCount = Object.entries(opts.rules)
      .filter(
        ([ruleName, {severity}]) =>
          severity !== RuleSeverities.Off && allRuleNames.has(ruleName),
      )
      .map(([ruleName]) => ruleName).length;

    const planLintText = `${bold('lint')} using ${plural(
      'rule',
      enabledRuleCount,
      true,
    )}`;
    const scriptLintText = `${bold('run')} ${plural(
      'script',
      opts.script.length,
      true,
    )}}`;

    const planOperation =
      opts.lint && !isEmpty(opts.script)
        ? `will ${planLintText} and ${scriptLintText}`
        : opts.lint
          ? `will ${planLintText}`
          : `will ${scriptLintText}`;

    let msg = `Plan: ${planOperation} in `;
    if (workspaceInfo.length > 1) {
      msg += plural('workspace', workspaceInfo.length, true);
    } else {
      msg += magentaBright(head(workspaceInfo)!.pkgName);
    }
    if (pkgManagers.length > 1) {
      msg += ` using ${plural('package manager', pkgManagers.length, true)}`;
    } else {
      msg += ` using ${pkgManager(head(pkgManagers)!.spec)}`;
    }

    console.error(`${info} ${msg}\n`);
    spinner.start(`${randomItem(spinnerMsgs)}${ELLIPSIS}`);
  },
  onPackFailed({spinner, opts}, {error: err}) {
    spinner.fail(err.format(opts.verbose));
  },
  onInstallFailed({spinner, opts}, {error: err}) {
    spinner.fail(err.format(opts.verbose));
  },
  onLintFailed({spinner}, {results: lintResults}) {
    for (const {pkgName, results} of lintResults) {
      const failed = results.filter(
        ({type}) => type === 'FAILED',
      ) as CheckFailed[];
      if (isEmpty(failed)) {
        continue;
      }
      const lines = [
        `${plural('Issue', failed.length)} found in package ${magentaBright(
          pkgName,
        )}:`,
      ];
      const isError = failed.some(
        ({ctx: {severity}}) => severity === RuleSeverities.Error,
      );

      const failedByFilepath = groupBy(
        failed,
        ({filepath, ctx: {pkgJsonPath}}) => filepath ?? pkgJsonPath,
      );

      const ruleNameError = (rule: StaticRuleDef) =>
        `${dim('[')}${red(rule.name)}${dim(']')}`;
      const ruleNameWarning = (rule: StaticRuleDef) =>
        `${dim('[')}${yellow(rule.name)}${dim(']')}`;
      for (const [filepath, failed] of Object.entries(failedByFilepath)) {
        lines.push(`│ ${yellow(bold(hrRelativePath(filepath)))}:`);
        for (const {
          message,
          ctx: {severity},
          rule,
        } of failed) {
          if (severity === RuleSeverities.Error) {
            lines.push(`│   ${error} ${ruleNameError(rule)} — ${message}`);
          } else {
            lines.push(`│   ${warning} ${ruleNameWarning(rule)} — ${message}`);
          }
        }
      }

      const msg = lines.join('\n');
      if (isError) {
        spinner.fail(msg);
      } else {
        spinner.warn(msg);
      }
    }
  },
  onRuleError({spinner}, {error: err}) {
    spinner.fail(err.message);
  },
  onRunScriptsFailed({spinner, opts}, {results}) {
    for (const result of results) {
      if (result.type === 'FAILED') {
        // TODO: this is not verbose enough
        const details = result.error.format(opts.verbose);
        spinner.warn(
          `Script execution failure details for package ${bold(
            magentaBright(result.manifest.pkgName),
          )}:\n- ${details}\n`,
        );
      }
    }
  },
  onSmokeFailed({spinner}) {
    spinner.fail('🤮 Maurice!');
  },
  onSmokeOk({spinner}) {
    spinner.succeed('💖 Lovey-dovey!');
  },
  onLingered(_, {directories: dirs}) {
    console.error(
      `${warning} Lingering ${plural('temp directory', dirs.length)}:\n`,
    );
    for (const dir of dirs) {
      console.error(yellow(dir));
    }
  },
  onUnknownError({opts}, {error: err}) {
    console.error(
      `${error} midnight-smoker encountered an unexpected fatal error:`,
    );
    if (opts.verbose) {
      console.error(err);
    } else {
      if (isError(err)) {
        console.error(`${red(err.message)}\n`);
      } else {
        console.error(`${red(err)}`);
      }
      console.error(`${dim(italic('(try using --verbose for more details)'))}`);
    }
  },
  onAborted() {
    // pop a spinner
  },
};
