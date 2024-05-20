import {type IsLiteral, type Join, type Opaque} from 'type-fest';

export interface UniqueIdOptions<
  Pre extends string = '',
  Post extends string = '',
  D extends string = '.',
> {
  prefix?: Pre;
  postfix?: Post;
  delimiter?: D;
}

export type RandomString = Opaque<string, 'RandomString'>;

export type Prefix = Opaque<string, 'Prefix'>;

export type Postfix = Opaque<string, 'Postfix'>;

export type UniqueId<
  Pre extends string = '',
  Post extends string = '',
  D extends string = '.',
> = Pre extends ''
  ? Post extends ''
    ? RandomString
    : Join<[RandomString, IsLiteral<Post> extends true ? Post : Postfix], D>
  : Post extends ''
    ? Join<[IsLiteral<Pre> extends true ? Pre : Prefix, RandomString], D>
    : Join<
        [
          IsLiteral<Pre> extends true ? Pre : Prefix,
          RandomString,
          IsLiteral<Post> extends true ? Post : Postfix,
        ],
        D
      >;

export function uniqueId<
  const Pre extends string = '',
  const Post extends string = '',
  const D extends string = '.',
>(opts: UniqueIdOptions<Pre, Post, D> = {}): UniqueId<Pre, Post, D> {
  const tokens: string[] = [];
  const {prefix = '', postfix = '', delimiter = '.'} = opts;
  const id = Math.random().toString(36).substring(7);
  if (prefix) {
    tokens.push(prefix);
  }
  tokens.push(id);
  if (postfix) {
    tokens.push(postfix);
  }
  return tokens.join(delimiter) as UniqueId<Pre, Post, D>;
}
