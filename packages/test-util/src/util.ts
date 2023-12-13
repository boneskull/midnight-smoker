import path from 'node:path';

/**
 * Given a POSIX path, return a path appropriate for the current platform.
 */

export function safePath(posixPath: string) {
  const parsed = path.posix.parse(posixPath);
  return path.format(parsed);
}
