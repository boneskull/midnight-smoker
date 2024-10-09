/**
 * Provides {@link uniqueId} and related types
 *
 * @packageDocumentation
 */

import {type Join, type Tagged} from 'type-fest';

/**
 * Options for {@link uniqueId}
 */
export interface UniqueIdOptions<
  Pre extends string = '',
  Post extends string = '',
> {
  prefix?: Pre;
  suffix?: Post;
}

/**
 * A random string
 */
export type RandomString = Tagged<string, 'RandomString'>;

/**
 * A prefix for a unique identifier
 */
export type Prefix = Tagged<string, 'Prefix'>;

/**
 * A suffix for a unique identifier
 */
export type suffix = Tagged<string, 'suffix'>;

/**
 * A unique identifier
 */
export type UniqueId<
  Pre extends string = '',
  Post extends string = '',
  D extends string = '.',
> = Pre extends ''
  ? Post extends ''
    ? RandomString
    : Join<[RandomString, Post], D>
  : Post extends ''
    ? Join<[Pre, RandomString], D>
    : Join<[Pre, RandomString, Post], D>;

export type SomeUniqueId =
  | UniqueId
  | UniqueId<'', string>
  | UniqueId<string, string>
  | UniqueId<string>;

/**
 * Generates a unique identifier w/ prefix
 *
 * @template Pre Prefix
 * @param opts Options for the unique ID
 * @returns Unique ID
 */
export function uniqueId<const Pre extends string>(
  opts: UniqueIdOptions<Pre>,
): UniqueId<Pre>;

/**
 * Generates a unique identifier w/ suffix
 *
 * @template Post Suffix
 * @param opts Options for the unique ID
 * @returns Unique ID
 */
export function uniqueId<const Post extends string>(
  opts: UniqueIdOptions<'', Post>,
): UniqueId<'', Post>;

/**
 * Generates a unique identifier w/ prefix and suffix
 *
 * @template Pre Prefix
 * @template Post Suffix
 * @param opts Options for the unique ID
 * @returns Unique ID
 */
export function uniqueId<const Pre extends string, const Post extends string>(
  opts: UniqueIdOptions<Pre, Post>,
): UniqueId<Pre, Post>;

/**
 * Generates a unique identifier
 *
 * @returns Unique ID
 */
export function uniqueId(): UniqueId;

/**
 * Generates a unique identifier per options
 *
 * @template Pre Prefix
 * @template Post Suffix
 * @param opts Options for the unique ID
 * @returns Unique ID
 */
export function uniqueId<
  const Pre extends string = '',
  const Post extends string = '',
>(opts: UniqueIdOptions<Pre, Post> = {}) {
  const {prefix, suffix} = opts;
  const id = Math.random().toString(36).substring(7);
  return prefix
    ? suffix
      ? ([prefix, id, suffix].join('.') as UniqueId<Pre, Post>)
      : ([prefix, id].join('.') as UniqueId<Pre>)
    : suffix
      ? ([id, suffix].join('.') as UniqueId<'', Post>)
      : (id as UniqueId);
}
