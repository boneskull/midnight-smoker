import {SYSTEM} from '#constants';
import {type SmokerErrorCode} from '#error/codes';
import {type StaticPkgManagerSpec} from '#schema/pkg-manager/static-pkg-manager-spec';
import {
  formatCode,
  formatErrorMessage,
  formatNameAndVersion,
  formatPackage,
  formatPkgManager,
  formatStackTrace,
  formatUrl,
  hrRelativePath,
  indent,
  joinLines,
  stripAnsi,
} from '#util/format';
import {
  black,
  cyan,
  cyanBright,
  green,
  greenBright,
  grey,
  magentaBright,
  redBright,
} from 'chalk';
import path from 'node:path';
import terminalLink from 'terminal-link';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('format', function () {
      describe('hrRelativePath()', function () {
        it('should return a relative path with a leading "." and path separator', function () {
          const filepath = 'test/path';
          const cwd = process.cwd();
          expect(
            hrRelativePath(filepath, cwd),
            'to equal',
            `.${path.sep}test${path.sep}path`,
          );
        });

        it('should not require a second parameter (cwd)', function () {
          const filepath = 'test/path';
          expect(() => hrRelativePath(filepath), 'not to throw');
        });

        it('should use the process.cwd() as the default cwd', function () {
          const filepath = 'test/path';
          expect(
            hrRelativePath(filepath),
            'to equal',
            `.${path.sep}test${path.sep}path`,
          );
        });
      });

      describe('stripAnsi()', function () {
        it('should remove ANSI escape codes from a string', function () {
          const stringWithAnsi = '\u001b[4mcake\u001b[0m';
          expect(stripAnsi(stringWithAnsi), 'to equal', 'cake');
        });
      });

      describe('formatUrl()', function () {
        it('should format a URL as a clickable link if supported', function () {
          const url = 'https://example.com';
          const text = 'Example';
          const result = formatUrl(url, text);
          expect(result, 'to equal', terminalLink(text, url));
        });

        it('should format a URL with the URL as text if no text is provided', function () {
          const url = 'https://example.com';
          const result = formatUrl(url);
          expect(result, 'to equal', terminalLink(url, url));
        });
      });

      describe('formatNameAndVersion()', function () {
        it('should format a name and version with colors', function () {
          const name = 'example';
          const version = '1.0.0';
          const result = formatNameAndVersion(name, version);
          expect(
            result,
            'to equal',
            `${cyanBright(name)}${cyan('@')}${cyanBright(version)}`,
          );
        });

        it('should format a name without version with colors', function () {
          const name = 'example';
          const result = formatNameAndVersion(name);
          expect(result, 'to equal', cyanBright(name));
        });
      });

      describe('formatPkgManager()', function () {
        it('should format a package manager spec with version and bin', function () {
          const spec: StaticPkgManagerSpec = {
            bin: 'npm',
            name: 'npm',
            version: '7.0.0',
          } as any;
          const result = formatPkgManager(spec);
          expect(
            result,
            'to equal',
            `${greenBright(spec.name)}${green('@')}${greenBright(
              spec.version,
            )} ${green(`(${SYSTEM})`)}`,
          );
        });

        it('should format a package manager spec without version', function () {
          const spec: StaticPkgManagerSpec = {bin: 'npm', name: 'npm'} as any;
          const result = formatPkgManager(spec);
          expect(
            result,
            'to equal',
            `${greenBright(spec.name)} ${green(`(${SYSTEM})`)}`,
          );
        });

        it('should format a non-system package manager spec (without bin)', function () {
          const spec: StaticPkgManagerSpec = {
            name: 'npm',
            version: '7.0.0',
          } as any;
          const result = formatPkgManager(spec);
          expect(
            result,
            'to equal',
            `${greenBright(spec.name)}${green('@')}${greenBright(
              spec.version,
            )}`,
          );
        });

        it('should format a non-system package manager spec (without bin) w/o version', function () {
          const spec: StaticPkgManagerSpec = {name: 'npm'} as any;
          const result = formatPkgManager(spec);
          expect(result, 'to equal', greenBright(spec.name));
        });
      });

      describe('formatPackage()', function () {
        it('should format a package name with colors', function () {
          const pkgName = 'example-package';
          const result = formatPackage(pkgName);
          expect(result, 'to equal', magentaBright(pkgName));
        });
      });

      describe('formatErrorMessage()', function () {
        it('should format an error message with colors', function () {
          const message = 'An error occurred';
          const result = formatErrorMessage(message);
          expect(result, 'to equal', redBright(message));
        });
      });

      describe('formatCode()', function () {
        it('should format an error code with colors', function () {
          const code: SmokerErrorCode = 'ERR_EXAMPLE' as any;
          const result = formatCode(code);
          expect(result, 'to equal', `${black('[')}${grey(code)}${black(']')}`);
        });
      });

      describe('formatStackTrace()', function () {
        it('should format a stack trace of an error', function () {
          const error = new Error('Test error');
          const result = formatStackTrace(error);
          expect(result, 'to be a', 'string');
        });
      });

      describe('joinLines()', function () {
        it('should join an array of strings with newlines by default', function () {
          const lines = ['line1', 'line2', 'line3'];
          const result = joinLines(lines);
          expect(result, 'to equal', 'line1\nline2\nline3');
        });

        it('should join an array of strings with a custom separator', function () {
          const lines = ['line1', 'line2', 'line3'];
          const result = joinLines(lines, ', ');
          expect(result, 'to equal', 'line1, line2, line3');
        });
      });

      describe('indent()', function () {
        it('should indent a string by the specified number of spaces', function () {
          const value = 'line1\nline2';
          const result = indent(value, 2);
          expect(result, 'to equal', '    line1\n    line2');
        });

        it('should indent an array of strings by the specified number of spaces', function () {
          const value = ['line1', 'line2'];
          const result = indent(value, 2);
          expect(result, 'to equal', ['    line1', '    line2']);
        });

        it('should indent a string with a custom prefix', function () {
          const value = 'line1\nline2';
          const result = indent(value, {level: 0, prefix: '> '});
          expect(result, 'to equal', '> line1\n> line2');
        });

        it('should wrap text to the specified width', function () {
          const value = 'This is a long line that should be wrapped';
          const result = indent(value, {wrap: 20});
          expect(
            result,
            'to equal',
            '  This is a long\n  line that should\n  be wrapped',
          );
        });

        it('should support disabling the trimming of trailing whitespace', function () {
          const value = 'This is a long line that should be wrapped';
          const result = indent(value, {trimEnd: false, wrap: 20});
          expect(
            result,
            'to equal',
            '  This is a long \n  line that should \n  be wrapped',
          );
        });
      });
    });
  });
});
