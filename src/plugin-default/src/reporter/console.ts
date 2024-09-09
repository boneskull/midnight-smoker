import {bold, dim, italic, magentaBright, red, yellow} from 'chalk';
import spinners from 'cli-spinners';
import Debug from 'debug';
import {groupBy, head, isEmpty} from 'lodash';
import {error, info, warning} from 'log-symbols';
import {FAILED, PACKAGE_JSON} from 'midnight-smoker/constants';
import {type Reporter} from 'midnight-smoker/reporter';
import {
  type CheckResultFailed,
  RuleIssue,
  RuleSeverities,
  type StaticRule,
} from 'midnight-smoker/rule';
import {
  formatErrorMessage,
  formatPkgManager,
  hrRelativePath,
} from 'midnight-smoker/util';
import ora, {type Ora} from 'ora';

import {ELLIPSIS, plural, preface} from './util.js';

const debug = Debug('midnight-smoker:plugin-default:reporter:console');

/**
 * Picks a random item from a list
 *
 * @param items List of items
 * @returns Some item, assuming `items` is not empty
 */
function randomItem<T>(items: [T, ...T[]] | readonly [T, ...T[]] | T[]): T {
  const index = Math.floor(Math.random() * items.length);
  return items[index];
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

export const ConsoleReporter: Reporter<ConsoleReporterContext> = {
  description: 'Default console reporter (for humans)',
  name: 'console',
  onAborted() {
    // pop a spinner
  },
  onInstallFailed({spinner}, {error: err}) {
    spinner.fail(`${err}`);
  },
  onLingered(_, {directories: dirs}) {
    console.error(
      `${warning} Lingering ${plural('temp directory', dirs.length)}:\n`,
    );
    for (const dir of dirs) {
      console.error(yellow(dir));
    }
  },
  async onLintFailed({spinner}, {results: lintResults}) {
    for (const {pkgName, results} of lintResults) {
      const failed = results.filter(
        ({type}) => type === FAILED,
      ) as CheckResultFailed[];
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
        ({ctx: {pkgJsonPath}, filepath}) => filepath ?? pkgJsonPath,
      );

      const ruleNameError = (rule: StaticRule) =>
        `${dim('[')}${red(rule.name)}${dim(']')}`;
      const ruleNameWarning = (rule: StaticRule) =>
        `${dim('[')}${yellow(rule.name)}${dim(']')}`;
      for (const [filepath, failed] of Object.entries(failedByFilepath)) {
        lines.push(`│ ${yellow(bold(hrRelativePath(filepath)))}:`);
        for (const {
          ctx,
          filepath = PACKAGE_JSON,
          jsonField,
          message,
          rule,
        } of failed) {
          if (ctx.severity === RuleSeverities.Error) {
            lines.push(`│   ${error} ${ruleNameError(rule)} — ${message}`);
          } else {
            lines.push(`│   ${warning} ${ruleNameWarning(rule)} — ${message}`);
          }
          if (jsonField) {
            let sourceCtx = await RuleIssue.getSourceContext(
              ctx.workspace,
              filepath,
              jsonField,
            );
            sourceCtx = sourceCtx
              .split('\n')
              .map((line) => `│     ${line}`)
              .join('\n');
            lines.push(sourceCtx);
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
  onPackFailed({spinner}, {error: err}) {
    spinner.fail(`${err}`);
  },
  onRuleError({spinner}, {error: err}) {
    spinner.fail(formatErrorMessage(err.message));
  },
  onRunScriptsFailed({opts, spinner}, {results}) {
    for (const result of results) {
      if (result.type === FAILED) {
        // TODO this is not verbose enough
        // TODO test what happens when there are multiple failed results
        const details = result.error.format(opts.verbose);
        spinner.warn(
          `Script execution failure details for package ${bold(
            magentaBright(result.manifest.pkgName),
          )}:\n- ${details}\n`,
        );
      }
    }
  },
  onSmokeBegin(
    {pkgJson, spinner},
    {pkgManagers, plugins, smokerOptions, workspaceInfo},
  ) {
    preface(pkgJson, plugins);

    const allRuleNames = new Set(plugins.flatMap(({ruleNames}) => ruleNames));
    const enabledRuleCount = Object.entries(smokerOptions.rules)
      .filter(
        ([ruleName, {severity}]) =>
          severity !== RuleSeverities.Off && allRuleNames.has(ruleName),
      )
      .map(([ruleName]) => ruleName).length;

    // TODO: I don't love how this looks
    const planLintText = `${bold('lint')} using ${plural(
      'rule',
      enabledRuleCount,
      true,
    )}`;
    const scriptLintText = `${bold('run')} ${plural(
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

    let msg = `${italic('Plan:')} ${planOperation} in `;
    if (workspaceInfo.length > 1) {
      msg += plural('workspace', workspaceInfo.length, true);
    } else {
      msg += magentaBright(head(workspaceInfo)!.pkgName);
    }
    if (pkgManagers.length > 1) {
      msg += ` using ${plural('package manager', pkgManagers.length, true)}`;
    } else {
      msg += ` using ${formatPkgManager(head(pkgManagers)!)}`;
    }

    console.error(`${info} ${msg}\n`);
    spinner.start(`${randomItem(spinnerMsgs)}${ELLIPSIS}`);
  },
  onSmokeError({opts: {verbose}, spinner}, {error}) {
    debug('smoke error:', error);
    let msg = error.format(verbose);
    if (!verbose) {
      msg += `\n${italic('Try again with --verbose for more details')}\n`;
    }
    spinner.fail(msg);
  },
  onSmokeFailed({spinner}, {success}) {
    if (success) {
      spinner.succeed('Lovey-dovey! 💖');
    } else {
      spinner.fail('Maurice! 🤮');
    }
  },
  onSmokeOk({spinner}) {
    spinner.succeed('Lovey-dovey! 💖');
  },
  setup(ctx) {
    ctx.spinner = ora({spinner: spinners.random});
  },
};
