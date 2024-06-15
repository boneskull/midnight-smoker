import {type WorkspaceInfoLike} from '#schema/workspace-info';
import {type Except, type TupleToUnion} from 'type-fest';

/**
 * Props which are not allowed in a {@link Result}.
 */
const OmittedResultProps = ['pkgJson'] as const;

/**
 * A union of the props in {@link OmittedResultProps}.
 */
type OmittedResultProp = TupleToUnion<typeof OmittedResultProps>;

/**
 * Converts an object extending {@link WorkspaceInfoLike} to a {@link Result},
 * suitable for serialization
 *
 * @template T Any object extending {@link WorkspaceInfoLike}
 * @param obj Any object extending {@link WorkspaceInfoLike}
 * @returns A {@link Result} object
 */
export function asResult<T extends WorkspaceInfoLike>(obj: T): Result<T> {
  // loop over all omitted props and remove them from obj
  return OmittedResultProps.reduce((acc, prop) => {
    const {[prop]: _, ...result} = acc;
    return result as Result<T>;
  }, obj as Result<T>);
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
export type Result<T extends WorkspaceInfoLike> = Except<
  T,
  OmittedResultProp,
  {requireExactProps: true}
>;
