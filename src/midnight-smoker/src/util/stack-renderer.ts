/**
 * Exports {@link getStackRenderer} which helps format stack traces.
 *
 * @packageDocumentation
 */
import {MIDNIGHT_SMOKER} from '#constants';
import {memoize} from 'lodash';
import PrettyError from 'pretty-error';

import {SOURCE_ROOT} from '../root.js';

/**
 * All possible styles supported by {@link https://npm.im renderkid}
 */
export type StyleProp =
  | 'background'
  | 'bullet'
  | 'color'
  | 'display'
  | 'height'
  | 'margin'
  | 'marginBottom'
  | 'marginLeft'
  | 'marginRight'
  | 'marginTop'
  | 'padding'
  | 'paddingBottom'
  | 'paddingLeft'
  | 'paddingRight'
  | 'paddingTop'
  | 'width';

/**
 * Style config for {@link PrettyError}
 */
export type Styles = Record<string, Partial<Record<StyleProp, string>>>;

/**
 * Type of a single line in a stack trace per {@link PrettyError}.
 */
type TraceLine = {
  addr: string;
  col: number;
  dir: string;
  file: string;
  jsCol: number;
  jsLine: number;
  line: number;
  original: string;
  packageName: string;
  packages: string[];
  path: string;
  shortenedAddr: string;
  shortenedPath: string;
  what: null | string;
};

/**
 * Options for {@link getStackRenderer}.
 */
export type GetStackRendererOptions = {
  config?: PrettyError.ConfigObject;
  styles?: Styles;
};

/**
 * {@inheritDoc getStackRenderer}
 */
function _getStackRenderer({
  config = {},
  styles = {},
}: GetStackRendererOptions = {}): PrettyError {
  const renderer = new PrettyError();
  return renderer
    .config({...DEFAULT_CONFIG, ...config})
    .appendStyle({...DEFAULT_STYLES, ...styles});
}

/**
 * Config for {@link PrettyError}
 *
 * @privateRemarks
 * TODO: try to figure out how to show the `code` somewhere
 */
const DEFAULT_CONFIG = {
  filters: [
    (traceLine: TraceLine) => {
      // this adds a little path info the display,
      // which would otherwise just be the filename.
      // this does not impact the "address" of the error (`addr`)
      if (traceLine.path.includes(MIDNIGHT_SMOKER)) {
        traceLine.file = traceLine.path.replace(
          SOURCE_ROOT,
          `[${MIDNIGHT_SMOKER}]`,
        );
      }
      traceLine.what = traceLine.what ? `${traceLine.what}()` : null;
      return true;
    },
  ],
  skip: [
    // this should actually skip node internals.
    // the built-in filter only works with old node versions
    (traceLine: TraceLine) =>
      Boolean(traceLine?.dir?.startsWith('node:internal')),
  ],
  // anything coming out of xstate is gonna be useless
  skipPackages: ['xstate'],
} as const satisfies PrettyError.ConfigObject;

/**
 * This is config for {@link https://npm.im/renderkid renderkid}.
 *
 * THe keys we're overriding are declared
 * {@link https://github.com/AriaMinaei/pretty-error/blob/master/src/defaultStyle.coffee here}.
 *
 * @see {@link https://github.com/AriaMinaei/RenderKid}
 * @see {@link https://github.com/AriaMinaei/pretty-error}
 */
const DEFAULT_STYLES = {
  'pretty-error': {
    marginLeft: '2',
  },
  'pretty-error > header > message': {
    color: 'bright-red',
  },
  'pretty-error > header > title > kind': {
    background: 'none',
    color: 'red',
  },
  'pretty-error > trace': {
    margin: '0',
  },
  'pretty-error > trace > item': {
    margin: '0 0 0 2',
  },
} as const satisfies Styles;

/**
 * Creates (or loads from cache) a stack trace renderer.
 *
 * @param options - Options for the renderer
 */
export const getStackRenderer = memoize(_getStackRenderer);
