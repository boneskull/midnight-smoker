import stripAnsi from 'strip-ansi';

/**
 * Strips a bunch of nondeterministic info from CLI output so that we can take a
 * snapshot of it.
 *
 * @param str - String of CLI output; usually either `stdout` or `stderr`
 * @param stripPmVersions - If true, replace `version` in
 *   `(npm|yarn|pnpm)@<version>` with the string `<version>`.
 * @returns Fixed output
 */

export function fixupOutput(str: string, stripPmVersions = true) {
  let result = stripAnsi(str)
    // strip the paths to npm/node/corepack in command
    .replace(
      /(?:[^" ]+?)(\/(\.)?bin\/(node|npm|corepack)(?:\.exe|\.cmd)?)/g,
      '<path/to/>$1',
    )
    .replace(/--pack-destination=\S+/g, '--pack-destination=<path/to/dir>')
    .replace(/(?<=\b)\S+?\.(log|tgz|txt)/g, '<path/to/some>.$1')
    // strip the versions since it will change
    .replace(/midnight-smoker v\d+\.\d+\.\d+/g, 'midnight-smoker v<version>')
    .replace(/--version\\n\\n\d+\.\d+\.\d+/g, '--version\\n\\n<version>')
    // strip the path to `cli.js` since it differs per platform
    .replace(/node(\.exe)?\s+\S+?smoker\.js/g, '<path/to/>smoker.js')
    // more directories
    .replace(/"cwd":\s+"[^"]+"/g, '"cwd": "<cwd>"')
    .replace(/(cwd|dest):\s+'[^']+'/g, "$1: '<$1>'")
    .replace(/in\sdir\s+[^:]+/g, 'in dir <cwd>')
    .replace(
      /"tarballFilepath":\s+"[^"]+"/g,
      '"tarballFilepath": "<tarball.tgz>"',
    )
    .replace(/"(install|pkg(Json)?)Path":\s+"[^"]+"/g, '"$1": "<some/path>"')
    // stack traces
    .replace(/\s+at\s.+?:\d+:\d+[^\n]+?/g, '<loc>:<line>:<col>');

  if (stripPmVersions) {
    result = result.replace(
      /(npm|yarn|pnpm|midnight-smoker)@(?:(?:\d+\.\d+\.\d+)|latest)/g,
      '$1@<version>',
    );
  }

  return result;
}
