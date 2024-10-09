import {bold, dim, italic, red, yellow} from 'chalk';
import spinners from 'cli-spinners';
import Debug from 'debug';
import {groupBy, head, isEmpty} from 'lodash';
import {error, info, warning} from 'log-symbols';
import {FAILED} from 'midnight-smoker/constants';
import {type Reporter, type Subscription} from 'midnight-smoker/reporter';
import {
  type Issue,
  RuleIssue,
  RuleSeverities,
  type StaticRule,
} from 'midnight-smoker/rule';
import {
  formatPackage,
  formatPkgManager,
  indent,
  joinLines,
} from 'midnight-smoker/util';
import ora, {type Ora} from 'ora';

import {ELLIPSIS, plural, preface} from './util';

type ConsoleReporterContext = {
  spinner: Ora;
  subscription: Subscription;
};

/**
 * Picks a random item from a list
 *
 * @param items List of items
 * @returns Some item, assuming `items` is not empty
 */
const randomItem = <T>(items: [T, ...T[]] | readonly [T, ...T[]] | T[]): T => {
  const index = Math.floor(Math.random() * items.length);
  return items[index]!;
};

const debug = Debug('midnight-smoker:plugin-default:reporter:console');

/**
 * Prefix symbol for column 0 when reporting issues
 */
const PIPE = '│';

/**
 * Separator used in various places
 */
const SEPARATOR = '─';

/**
 * Formats a rule name when there's an `error`-severity issue
 *
 * @param rule Rule to format
 * @returns Formatted rule name
 */
const lintErrorRuleName = (rule: StaticRule): string =>
  [dim('['), red(rule.name), dim(']')].join('');

/**
 * Formats a rule name when there's a `warning`-severity issue
 *
 * @param rule Rule to format
 * @returns Formatted rule name
 */
const lintWarningRuleName = (rule: StaticRule): string =>
  [dim('['), yellow(rule.name), dim(']')].join('');

/**
 * Returns a line containing filepath, prefixed and indented
 *
 * @param filepath Path to file
 * @returns Formatted line
 */
const lintFilepathLine = (filepath: string): string => {
  const filepathWords = [yellow(filepath), ':'];
  const filepathLine = filepathWords.join('');
  return indent(filepathLine, {
    level: 1,
    prefix: PIPE,
  });
};

/**
 * Returns a line containing the issue message, rule message and severity
 *
 * @param issue Issue to to format
 * @returns Formatted issue
 */
const lintIssueLine = ({ctx, message, rule}: Issue): string => {
  let issueWords = [SEPARATOR, message];
  issueWords =
    ctx.severity === RuleSeverities.Error
      ? [error, lintErrorRuleName(rule), ...issueWords]
      : [warning, lintWarningRuleName(rule), ...issueWords];
  const issueLine = issueWords.join(' ');
  return indent(issueLine, {
    level: 2,
    prefix: PIPE,
  });
};

/**
 * If the issue has enough information to provide a source context, return the
 * formatted source contexgt
 *
 * @param issue Issue to get the source context for
 * @returns Formatted string or `undefined` if no source context available
 */
const lintSourceContextLines = (issue: Issue): string | undefined => {
  const sourceCtx = RuleIssue.getSourceContext(issue);
  if (sourceCtx.trim()) {
    return indent(sourceCtx, {level: 3, prefix: PIPE});
  }
};

/**
 * Random messages for the spinner
 */
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
  onInstallFailed({opts: {verbose}, spinner}, {error}) {
    spinner.fail(error.format(verbose));
  },
  onLingered(_, {directories}) {
    console.error(
      `${warning} Lingering ${plural('temp directory', directories.length)}:\n`,
    );
    const dirs = joinLines(indent(directories.map(yellow)));
    console.error(dirs);
  },
  async onLintFailed({spinner}, {results: lintResults}) {
    // TODO: should we show successful results?

    // results will be a combination of passed and failed results.
    // all we know is that there is at least one failed result.
    const maybeIssuesForPackage = lintResults.filter(
      (result) => result.type === FAILED,
    );

    // grouping by package
    for (const {pkgName, results} of maybeIssuesForPackage) {
      const issues = results.filter((result) => result.type === FAILED);

      const headerLine = [
        plural('Issue', issues.length),
        'found in package',
        `${formatPackage(pkgName)}:`,
      ].join(' ');

      const lines = [headerLine];

      // now grouping by file within the package
      const issuesByFilepath = groupBy(
        issues,
        ({ctx: {pkgJsonPath}, filepath}) => filepath ?? pkgJsonPath,
      );

      /**
       * Tracks if _any_ issue has `error` severity
       */
      let isError = false;

      for (const [filepath, issues] of Object.entries(issuesByFilepath)) {
        lines.push(lintFilepathLine(filepath));

        for (const issue of issues) {
          lines.push(lintIssueLine(issue));

          // set isError to true so later we can call `spinner.fail()`
          if (!isError && issue.ctx.severity === RuleSeverities.Error) {
            isError = true;
          }

          const sourceCtxLines = lintSourceContextLines(issue);
          if (sourceCtxLines) {
            lines.push(sourceCtxLines);
          }
        }
      }

      const msg = joinLines(lines);
      if (isError) {
        spinner.fail(msg);
      } else {
        spinner.warn(msg);
      }
    }
  },
  onPackFailed({opts: {verbose}, spinner}, {error}) {
    spinner.fail(error.format(verbose));
  },
  onRuleError({opts: {verbose}, spinner}, {error}) {
    spinner.fail(error.format(verbose));
  },
  onRunScriptsFailed({opts: {verbose}, spinner}, {results}) {
    const failedResults = results.filter((result) => result.type === FAILED);
    for (const result of failedResults) {
      // TODO this is not verbose enough
      // TODO test what happens when there are multiple failed results
      const details = result.error.format(verbose);
      const warning = joinLines([
        [
          'Script execution failure details for package',
          `${formatPackage(result.manifest.pkgName)}:`,
        ].join(' '),
        [SEPARATOR, details].join(' '),
      ]);
      spinner.warn(warning);
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
      msg += formatPackage(head(workspaceInfo)!.pkgName);
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
