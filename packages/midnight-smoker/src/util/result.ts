import type {WorkspaceInfoSchema} from '#schema/workspace-info';

import {type NormalizedPackageJson} from '#schema/package-json';
import {omit} from 'lodash';
import {type PackageJson, type TupleToUnion} from 'type-fest';

/**
 * Props which are not allowed in a {@link Result}.
 */
const OmittedResultProps = ['pkgJson'] as const;

/**
 * A union of the props in {@link OmittedResultProps}.
 */
type OmittedResultProp = TupleToUnion<typeof OmittedResultProps>;

export type ResultLike = {
  pkgJson?: NormalizedPackageJson | PackageJson;
};

/**
 * Converts an object extending {@link ResultLike} to a {@link Result}, suitable
 * for serialization
 *
 * @template T Any object extending {@link WorkspaceInfoLike}
 * @param obj Any object extending {@link WorkspaceInfoLike}
 * @returns A {@link Result} object
 */
export function asResult<T extends ResultLike>(obj: T): Result<T> {
  return omit(obj, OmittedResultProps);
}

/**
 * A {@link WorkspaceInfoLike} object with the `pkgJson` property removed.
 *
 * This exists because if we emit JSON output, the full, _packument_-style
 * contents of any given `package.json` may be repeated as nauseum, deep within
 * it (which is annoying). The results in the output (and likewise within
 * events) all extend {@link WorkspaceInfoLike}.
 *
 * To convert a {@link WorkspaceInfoLike} object to a `Result`, use
 * {@link asResult}.
 *
 * @template T A {@link WorkspaceInfoLike} object.
 * @see {@link asResult}
 * @see {@link Except}
 */
export type Result<T extends ResultLike> = Omit<T, OmittedResultProp>;

/**
 * Creates a strict schema from one extending {@link WorkspaceInfoSchema} which
 * omits the `pkgJson` field.
 *
 * @param schema - A schema extending {@link WorkspaceInfoSchema}
 * @returns A new schema
 */

export function asResultSchema<T extends typeof WorkspaceInfoSchema>(
  schema: T,
) {
  const description: string = schema.description
    ? `${schema.description} (without \`pkgJson\` field)`
    : 'Object without `pkgJson` field';
  return schema.omit({pkgJson: true}).describe(description);
}
